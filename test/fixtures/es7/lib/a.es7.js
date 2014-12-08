class A {
  constructor (text) {
    this.text = text;
  }

  getText () {
    return this.text;
  }

  throwError (mess) {
    throw new Error(mess);
  }
}

export {A};

