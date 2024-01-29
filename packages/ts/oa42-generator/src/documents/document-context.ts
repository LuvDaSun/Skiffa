import { loadYAML } from "../utils/index.js";
import { DocumentBase } from "./document-base.js";

export interface DocumentOptions {
  defaultTypeName: string;
  nameMaximumIterations: number;
  transformMaximumIterations: number;
}

export interface DocumentInitializer<N = unknown> {
  documentUri: URL;
  documentNode: N;
  options: DocumentOptions;
}

export type DocumentFactory<N = unknown> = (
  initializer: DocumentInitializer<N>,
) => DocumentBase<N> | undefined;

export class DocumentContext {
  private factories = new Array<DocumentFactory>();
  private document!: DocumentBase;

  constructor(private readonly options: DocumentOptions) {
    //
  }

  public registerFactory(factory: DocumentFactory) {
    this.factories.push(factory);
  }

  public async loadFromUrl(documentUri: URL) {
    documentUri = new URL("", documentUri);

    const documentNode = await loadYAML(documentUri);
    await this.loadFromDocument(documentUri, documentNode);
  }

  public async loadFromDocument(documentUri: URL, documentNode: unknown) {
    documentUri = new URL("", documentUri);

    for (const factory of this.factories) {
      const document = factory({
        documentUri,
        documentNode,
        options: this.options,
      });
      if (document != null) {
        await document.load();
        this.document = document;
        break;
      }
    }

    if (this.document == null) {
      throw new Error("unable to load document");
    }
  }

  public getApiModel() {
    return this.document.getApiModel();
  }

  public getSpecification() {
    return this.document.getSpecification();
  }
}
