declare module "@aws-sdk/client-translate" {
  export class TranslateClient {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class TranslateTextCommand {
    constructor(input: any);
  }
}
