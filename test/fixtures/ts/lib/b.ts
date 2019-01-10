class B {
  private text: string;

  public constructor (text: string) {
    this.text = text;
  }

  public getText (): string {
    return this.text;
  }

  public throwError (mess) {
    throw new Error(mess);
  }
}

export { B };
