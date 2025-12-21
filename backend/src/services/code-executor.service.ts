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

export class CodeExecutorService {
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

    let timeoutHandle: NodeJS.Timeout | null = null;
    let timedOut = false;

    try {
      // Set up timeout
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        vm.dispose();
      }, timeout);

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

      if (timedOut) {
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
      if (timedOut) {
        throw new Error('Code execution timeout (5 seconds)');
      }

      // Improve error messages
      let errorMessage = error.message || 'Unknown error';

      // Parse QuickJS error messages for better user feedback
      if (errorMessage.includes('SyntaxError')) {
        errorMessage = `Syntax error: ${errorMessage}`;
      } else if (errorMessage.includes('ReferenceError')) {
        errorMessage = `Reference error: ${errorMessage}`;
      } else if (errorMessage.includes('TypeError')) {
        errorMessage = `Type error: ${errorMessage}`;
      }

      throw new Error(`Code execution error: ${errorMessage}`);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      try {
        vm.dispose();
      } catch {
        // VM already disposed by timeout
      }
    }
  }

}
