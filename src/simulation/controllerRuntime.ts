import { LanguageType } from '../types/simulation';

export interface ControllerResult {
  output: number;
  p: number;
  i: number;
  d: number;
  f: number;
}

export interface RuntimeDiagnostic {
  isValid: boolean;
  errorMessage: string | null;
  lineNumber: number | null;
}

export class ControllerRuntime {
  public language: LanguageType = 'python';
  public userCode: string = '';
  public state: Record<string, any> = {};
  public diagnostic: RuntimeDiagnostic = {
    isValid: true,
    errorMessage: null,
    lineNumber: null,
  };

  private compiledUpdateFn: ((target: number, current: number, dt: number, state: Record<string, any>) => ControllerResult) | null = null;

  constructor(language: LanguageType, initialCode: string) {
    this.language = language;
    this.userCode = initialCode;
    this.compile();
  }

  public setCode(code: string, language?: LanguageType) {
    this.userCode = code;
    if (language) {
      this.language = language;
    }
    this.compile();
  }

  public resetState() {
    this.state = {};
    if (this.language === 'javascript') {
      try {
        const fn = new Function(`${this.userCode}; return typeof initController === 'function' ? initController() : {};`);
        this.state = fn() || {};
      } catch {
        this.state = { kp: 28, ki: 6.5, kd: 1.8, integral: 0, prevError: 0 };
      }
    } else if (this.language === 'python') {
      this.compileAndInitPythonState();
    } else {
      // C++ default state extraction
      this.extractCppState();
    }
  }

  // Compile Python to fast JavaScript
  private transpilePythonToJs(pyCode: string): string {
    const lines = pyCode.split('\n');
    let jsLines: string[] = [];

    // Helper math functions
    jsLines.push('const math = Math;');
    jsLines.push('const sin = Math.sin;');
    jsLines.push('const cos = Math.cos;');
    jsLines.push('const pi = Math.PI;');
    jsLines.push('const abs = Math.abs;');
    jsLines.push('const min = Math.min;');
    jsLines.push('const max = Math.max;');

    let inFunction = false;
    let funcIndent = 0;
    let fnName = '';

    for (let i = 0; i < lines.length; i++) {
      let rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Comment
      if (trimmed.startsWith('#')) {
        jsLines.push(`// ${trimmed.slice(1)}`);
        continue;
      }
      if (!trimmed) {
        jsLines.push('');
        continue;
      }

      // Check indentation
      const matchIndent = rawLine.match(/^(\s*)/);
      const currentIndent = matchIndent ? matchIndent[1].length : 0;

      // Detect function definition
      const defMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*:/);
      if (defMatch) {
        fnName = defMatch[1];
        const params = defMatch[2];
        jsLines.push(`${' '.repeat(currentIndent)}function ${fnName}(${params}) {`);
        inFunction = true;
        funcIndent = currentIndent;
        continue;
      }

      // End of function if dedented
      if (inFunction && currentIndent <= funcIndent && trimmed !== '') {
        jsLines.push('}');
        inFunction = false;
      }

      let line = trimmed;

      // Handle Python dictionary syntax: state["key"] or state['key']
      // Python elif -> else if
      if (line.startsWith('elif ')) {
        line = line.replace(/^elif\s+(.*?):/, 'else if ($1) {');
      } else if (line.startsWith('if ')) {
        line = line.replace(/^if\s+(.*?):/, 'if ($1) {');
      } else if (line.startsWith('else:')) {
        line = 'else {';
      }

      // Python ternary: a if cond else b -> (cond ? a : b)
      line = line.replace(/([a-zA-Z0-9_.\s]+)\s+if\s+([^:]+?)\s+else\s+([a-zA-Z0-9_.\s]+)/g, '($2 ? $1 : $3)');

      // Replace Python boolean
      line = line.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');

      // Auto add semicolon if not ending with { or }
      if (!line.endsWith('{') && !line.endsWith('}')) {
        line += ';';
      }

      jsLines.push(`${' '.repeat(currentIndent + (inFunction ? 2 : 0))}${line}`);
    }

    if (inFunction) {
      jsLines.push('}');
    }

    return jsLines.join('\n');
  }

  // Compile C++ to fast JavaScript
  private transpileCppToJs(cppCode: string): string {
    let js = cppCode;
    // Remove includes
    js = js.replace(/#include\s+<.*?>/g, '// include removed');
    // Replace PIDOutput class/struct construct
    js = js.replace(/PIDOutput\((.*?)\)/g, '({ output: $1 })');
    js = js.replace(/struct\s+ControllerState\s*\{([\s\S]*?)\};/g, '// state struct definition');
    // Replace PIDOutput update(...) with function update(...)
    js = js.replace(/PIDOutput\s+update\s*\((.*?)\)\s*\{/g, 'function update(target, current, dt, state) {');
    // Replace std::
    js = js.replace(/std::/g, '');
    js = js.replace(/fmax/g, 'Math.max');
    js = js.replace(/fmin/g, 'Math.min');
    js = js.replace(/sin/g, 'Math.sin');
    js = js.replace(/cos/g, 'Math.cos');
    js = js.replace(/abs/g, 'Math.abs');
    // Type definitions double, int, float
    js = js.replace(/\b(double|float|int)\s+([a-zA-Z0-9_]+)/g, 'let $2');
    // Member access state.property
    return js;
  }

  private extractCppState() {
    this.state = {
      kp: 28.0,
      ki: 6.5,
      kd: 1.8,
      integral: 0.0,
      prev_error: 0.0,
      max_voltage: 12.0,
      integral_limit: 4.0,
    };
    // Regex extract default values if declared in C++
    const kpMatch = this.userCode.match(/kp\s*=\s*([0-9.]+)/);
    if (kpMatch) this.state.kp = parseFloat(kpMatch[1]);
    const kiMatch = this.userCode.match(/ki\s*=\s*([0-9.]+)/);
    if (kiMatch) this.state.ki = parseFloat(kiMatch[1]);
    const kdMatch = this.userCode.match(/kd\s*=\s*([0-9.]+)/);
    if (kdMatch) this.state.kd = parseFloat(kdMatch[1]);
  }

  private compileAndInitPythonState() {
    try {
      const jsCode = this.transpilePythonToJs(this.userCode);
      const runner = new Function(`
        ${jsCode}
        if (typeof init_controller === 'function') {
          return init_controller();
        }
        return { kp: 28, ki: 6.5, kd: 1.8, integral: 0, prev_error: 0 };
      `);
      this.state = runner() || {};
    } catch {
      this.state = { kp: 28, ki: 6.5, kd: 1.8, integral: 0, prev_error: 0 };
    }
  }

  public compile() {
    this.diagnostic = {
      isValid: true,
      errorMessage: null,
      lineNumber: null,
    };

    try {
      let executableJs = '';
      if (this.language === 'python') {
        const js = this.transpilePythonToJs(this.userCode);
        executableJs = `
          ${js}
          return function(target, current, dt, state) {
            if (typeof update === 'function') {
              var res = update(target, current, dt, state);
              if (typeof res === 'number') {
                return { output: res, p: res, i: 0, d: 0, f: 0 };
              }
              return {
                output: (res && res.output !== undefined) ? res.output : 0,
                p: (res && res.p !== undefined) ? res.p : 0,
                i: (res && res.i !== undefined) ? res.i : 0,
                d: (res && res.d !== undefined) ? res.d : 0,
                f: (res && res.f !== undefined) ? res.f : 0
              };
            }
            return { output: 0, p: 0, i: 0, d: 0, f: 0 };
          };
        `;
      } else if (this.language === 'cpp') {
        const js = this.transpileCppToJs(this.userCode);
        executableJs = `
          ${js}
          return function(target, current, dt, state) {
            if (typeof update === 'function') {
              var res = update(target, current, dt, state);
              if (typeof res === 'number') return { output: res, p: res, i: 0, d: 0, f: 0 };
              var out = (res && res.output !== undefined) ? res.output : (res && res.p !== undefined ? res.p + (res.i||0) + (res.d||0) : 0);
              return {
                output: out,
                p: (res && res.p !== undefined) ? res.p : out,
                i: (res && res.i !== undefined) ? res.i : 0,
                d: (res && res.d !== undefined) ? res.d : 0,
                f: (res && res.f !== undefined) ? res.f : 0
              };
            }
            return { output: 0, p: 0, i: 0, d: 0, f: 0 };
          };
        `;
      } else {
        // JavaScript
        executableJs = `
          ${this.userCode}
          return function(target, current, dt, state) {
            if (typeof update === 'function') {
              var res = update(target, current, dt, state);
              if (typeof res === 'number') return { output: res, p: res, i: 0, d: 0, f: 0 };
              return {
                output: (res && res.output !== undefined) ? res.output : 0,
                p: (res && res.p !== undefined) ? res.p : 0,
                i: (res && res.i !== undefined) ? res.i : 0,
                d: (res && res.d !== undefined) ? res.d : 0,
                f: (res && res.f !== undefined) ? res.f : 0
              };
            }
            return { output: 0, p: 0, i: 0, d: 0, f: 0 };
          };
        `;
      }

      const factory = new Function(executableJs);
      this.compiledUpdateFn = factory();
      this.resetState();
    } catch (err: any) {
      this.diagnostic = {
        isValid: false,
        errorMessage: err.message || 'Syntax Error in controller code',
        lineNumber: err.lineNumber || null,
      };
      this.compiledUpdateFn = null;
    }
  }

  // Execute one step of the controller
  public execute(target: number, current: number, dt: number): ControllerResult {
    if (!this.compiledUpdateFn || !this.diagnostic.isValid) {
      return { output: 0, p: 0, i: 0, d: 0, f: 0 };
    }

    try {
      const result = this.compiledUpdateFn(target, current, dt, this.state);
      // Validate numbers
      return {
        output: isFinite(result.output) ? result.output : 0,
        p: isFinite(result.p) ? result.p : 0,
        i: isFinite(result.i) ? result.i : 0,
        d: isFinite(result.d) ? result.d : 0,
        f: isFinite(result.f) ? result.f : 0,
      };
    } catch (err: any) {
      this.diagnostic = {
        isValid: false,
        errorMessage: `Runtime Exception: ${err.message}`,
        lineNumber: null,
      };
      return { output: 0, p: 0, i: 0, d: 0, f: 0 };
    }
  }
}
