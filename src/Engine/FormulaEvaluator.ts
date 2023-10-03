import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  evaluate(formula: FormulaType) {
    this._errorMessage = "";

    // when the formula is empty
    if (formula.length === 0) {
        this._errorMessage = ErrorMessages.emptyFormula;
        return;
    }

    // when the formula starts or ends with an operator
    if(['+', '-', '*', '/'].includes(formula[0])||['+', '-', '*', '/'].includes(formula[formula.length-1])){
      this._errorMessage = ErrorMessages.invalidFormula;
      if(formula.length === 2 && this.isNumber(formula[0])){
        this._result = Number(formula[0]);
        return;
      }else if(formula.length === 3 && this.isNumber(formula[0]) 
      && !this.isNumber(formula[1])&& !this.isNumber(formula[2])){
        this._result = Number(formula[0]);
        return;
      }else if(formula.length === 4 && this.isNumber(formula[0]) 
      && !this.isNumber(formula[1])&& this.isNumber(formula[2]) 
      && !this.isNumber(formula[3])){
        formula.pop()
      }
    }

    //two stacks for values and operators
    const values: number[] = [];
    const operators: string[] = [];

    for (const token of formula) {
        if (this._errorOccured) break;

        if (this.isNumber(token)) {
            values.push(Number(token));
        } else if (this.isCellReference(token)) {
            const [value, error] = this.getCellValue(token);
            if (error) {
                this._errorMessage = error;
                this._errorOccured = true;
                break;
            }
            values.push(value);
        } else if (token === '(') {
            operators.push(token);
        } else if (token === ')') {
            if (!operators.includes('(')) {
                this._errorMessage = ErrorMessages.missingParentheses;
                this._errorOccured = true;
                break;
            }else if(values.length === 0){
                this._errorMessage = ErrorMessages.invalidFormula;
                this._errorOccured = true;
                break;
            }while (operators.length && operators[operators.length - 1] !== '(') {
                this.compute(values, operators);
            }
            operators.pop();
        } else { 
            if (!['+', '-', '*', '/'].includes(token)) {
                this._errorMessage = ErrorMessages.invalidOperator;
                this._errorOccured = true;
                break;
            }
            while (operators.length && this.hasPrecedence(token, operators[operators.length - 1])) {
                this.compute(values, operators);
            }
            operators.push(token);
        }
    }

    if (!this._errorOccured && operators.includes('(')) {
        this._errorMessage = ErrorMessages.missingParentheses;
        this._errorOccured = true;
    }

    while (!this._errorOccured && operators.length) {
        this.compute(values, operators);
    }

    if (!this._errorOccured && values.length > 1) {
        this._errorMessage = ErrorMessages.partial;
        this._errorOccured = true;
    }

    this._result = values.pop()! || 0;
  }
  
  private hasPrecedence(op1: string, op2: string): boolean {
    if (op2 === '(' || op2 === ')') return false;
    if ((op1 === '*' || op1 === '/') && (op2 === '+' || op2 === '-')) return false;
    return true;
  }

  private compute(values: number[], operators: string[]): void {
    const op = operators.pop();
    const b = values.pop()!;
    const a = values.pop()!;

    switch (op) {
      case '+':
        values.push(a + b);
        break;
      case '-':
        values.push(a - b);
        break;
      case '*':
        values.push(a * b);
        break;
      case '/':
        if (b === 0) {
          this._errorMessage = ErrorMessages.divideByZero;
          this._errorOccured = true;
          values.push(Infinity)
          return;
        }
        values.push(a / b);
        break;
      default:
        this._errorMessage = ErrorMessages.invalidOperator;
        this._errorOccured = true;
        return;
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;