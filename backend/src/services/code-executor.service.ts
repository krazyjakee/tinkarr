import { getQuickJS, QuickJSContext } from 'quickjs-emscripten';

export interface CodeExecutorOptions {
  timeout?: number; // milliseconds, default 5000
}

export interface ElementContext {
  text: string;
  html: string;
  attrs: Record<string, string>;
  find: (selector: string) => { text: string; attr: (name: string) => string | null } | null;
}

export interface CodeExecutorContext {
  items: ElementContext[];
  baseUrl: string;
}

export interface RssGeneratorContext {
  query?: string;
  season?: number;
  episode?: number;
  imdbId?: string;
  tvdbId?: string;
  categories?: string[];
  baseUrl: string;
}

export class CodeExecutorService {
  /**
   * Set up a timeout for VM execution
   */
  private setupTimeout(vm: QuickJSContext, timeout: number): {
    handle: NodeJS.Timeout;
    isTimedOut: () => boolean;
    cleanup: () => void;
  } {
    let timedOut = false;

    const handle = setTimeout(() => {
      timedOut = true;
      vm.dispose();
    }, timeout);

    return {
      handle,
      isTimedOut: () => timedOut,
      cleanup: () => {
        if (handle) {
          clearTimeout(handle);
        }
      }
    };
  }

  /**
   * Parse and improve error messages from QuickJS
   */
  private parseErrorMessage(error: any): string {
    let errorMessage = error.message || 'Unknown error';

    // Parse QuickJS error messages for better user feedback
    if (errorMessage.includes('SyntaxError')) {
      errorMessage = `Syntax error: ${errorMessage}`;
    } else if (errorMessage.includes('ReferenceError')) {
      errorMessage = `Reference error: ${errorMessage}`;
    } else if (errorMessage.includes('TypeError')) {
      errorMessage = `Type error: ${errorMessage}`;
    }

    return errorMessage;
  }

  /**
   * Execute user-provided JavaScript code in a sandboxed environment
   */
  async executeUserCode(
    code: string,
    context: CodeExecutorContext,
    options: CodeExecutorOptions = {}
  ): Promise<any[]> {
    const timeout = options.timeout || 5000;
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();

    const timeoutManager = this.setupTimeout(vm, timeout);

    try {

      // Create items array with find functions
      const itemsArray = vm.newArray();

      context.items.forEach((item, index) => {
        const itemObj = vm.newObject();

        // Set basic properties
        vm.setProp(itemObj, 'text', vm.newString(item.text));
        vm.setProp(itemObj, 'html', vm.newString(item.html));

        // Set attrs object
        const attrsObj = vm.newObject();
        for (const [key, value] of Object.entries(item.attrs)) {
          vm.setProp(attrsObj, key, vm.newString(value));
        }
        vm.setProp(itemObj, 'attrs', attrsObj);

        // Create find function for this item
        const findFn = vm.newFunction('find', (selectorHandle) => {
          const selector = vm.getString(selectorHandle);

          // Call the native find function
          const result = item.find(selector);

          if (result === null) {
            return vm.null;
          }

          // Create result object with text and attr function
          const resultObj = vm.newObject();
          vm.setProp(resultObj, 'text', vm.newString(result.text));

          // Create attr function
          const attrFn = vm.newFunction('attr', (nameHandle) => {
            const name = vm.getString(nameHandle);
            const attrValue = result.attr(name);
            return attrValue ? vm.newString(attrValue) : vm.null;
          });

          vm.setProp(resultObj, 'attr', attrFn);
          attrFn.dispose();

          return resultObj;
        });

        vm.setProp(itemObj, 'find', findFn);
        findFn.dispose();

        // Add to array
        vm.setProp(itemsArray, index, itemObj);
        itemObj.dispose();
        attrsObj.dispose();
      });

      // Set items and baseUrl in global scope
      vm.setProp(vm.global, 'items', itemsArray);
      vm.setProp(vm.global, 'baseUrl', vm.newString(context.baseUrl));
      itemsArray.dispose();

      // Wrap user code in a function that returns the result
      const wrappedCode = `
        (function() {
          ${code}
        })()
      `;

      // Execute code
      const resultHandle = vm.unwrapResult(vm.evalCode(wrappedCode));

      if (timeoutManager.isTimedOut()) {
        throw new Error('Code execution timeout (5 seconds)');
      }

      const result = vm.dump(resultHandle);
      resultHandle.dispose();

      // Validate result is array
      if (!Array.isArray(result)) {
        throw new Error('Code must return an array of results');
      }

      return result;
    } catch (error: any) {
      if (timeoutManager.isTimedOut()) {
        throw new Error('Code execution timeout (5 seconds)');
      }

      // Improve error messages
      const errorMessage = this.parseErrorMessage(error);
      throw new Error(`Code execution error: ${errorMessage}`);
    } finally {
      timeoutManager.cleanup();
      try {
        vm.dispose();
      } catch {
        // VM already disposed by timeout
      }
    }
  }

  /**
   * Execute RSS URL parameter generator code in a sandboxed environment
   * Returns an object with key-value pairs for RSS URL parameters
   */
  async executeRssParamsGenerator(
    code: string,
    context: RssGeneratorContext,
    options: CodeExecutorOptions = {}
  ): Promise<Record<string, string>> {
    const timeout = options.timeout || 5000;
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();

    const timeoutManager = this.setupTimeout(vm, timeout);

    try {

      // Set context variables in global scope
      vm.setProp(vm.global, 'baseUrl', vm.newString(context.baseUrl));

      if (context.query !== undefined) {
        vm.setProp(vm.global, 'query', vm.newString(context.query));
      }

      if (context.season !== undefined) {
        vm.setProp(vm.global, 'season', vm.newNumber(context.season));
      }

      if (context.episode !== undefined) {
        vm.setProp(vm.global, 'episode', vm.newNumber(context.episode));
      }

      if (context.imdbId !== undefined) {
        vm.setProp(vm.global, 'imdbId', vm.newString(context.imdbId));
      }

      if (context.tvdbId !== undefined) {
        vm.setProp(vm.global, 'tvdbId', vm.newString(context.tvdbId));
      }

      if (context.categories !== undefined) {
        const categoriesArray = vm.newArray();
        context.categories.forEach((cat, index) => {
          vm.setProp(categoriesArray, index, vm.newString(cat));
        });
        vm.setProp(vm.global, 'categories', categoriesArray);
        categoriesArray.dispose();
      }

      // Wrap user code in a function that returns the result
      const wrappedCode = `
        (function() {
          ${code}
        })()
      `;

      // Execute code
      const resultHandle = vm.unwrapResult(vm.evalCode(wrappedCode));

      if (timeoutManager.isTimedOut()) {
        throw new Error('Code execution timeout (5 seconds)');
      }

      const result = vm.dump(resultHandle);
      resultHandle.dispose();

      // Validate result is an object
      if (typeof result !== 'object' || result === null || Array.isArray(result)) {
        throw new Error('Code must return an object with key-value pairs for RSS parameters');
      }

      // Convert all values to strings
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(result)) {
        params[key] = String(value);
      }

      return params;
    } catch (error: any) {
      if (timeoutManager.isTimedOut()) {
        throw new Error('Code execution timeout (5 seconds)');
      }

      // Improve error messages
      const errorMessage = this.parseErrorMessage(error);
      throw new Error(`RSS params generator error: ${errorMessage}`);
    } finally {
      timeoutManager.cleanup();
      try {
        vm.dispose();
      } catch {
        // VM already disposed by timeout
      }
    }
  }

}
