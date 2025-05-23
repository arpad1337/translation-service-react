import LANGUAGES, { Language, Translation } from "../translations";
import { Observable, ReplaySubject } from "rxjs";
import ReactDOMServer from "react-dom/server";
import { ReactElement } from "react";
import { Parser } from "html-to-react";
import React from "react";

export function clonePrototypeFunctions(self: object): object {
  return Object.keys(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(self))).reduce(
    (accu: Record<string, typeof Function>, key: string) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof self[key] === "function") {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        accu[key] = self[key]!.bind(self);
      }
      return accu;
    },
    {},
  ) as object;
}

type ObjectWithStringKeysAndValues = {
  [key: string]: IToStringable;
};

type TraversableObject = string | ObjectWithStringKeysAndValues;

export interface IToStringable {
  toString: () => string;
}

export interface IToNodeable {
  toReactNode(): React.ReactNode;
}

export type TokenReplacer = () => React.ReactNode;

export type TranslationReplaceables<T> = { [key: string]: T };

export class TranslationToken implements IToStringable, IToNodeable {
  public _node: (React.ReactNode & this) | null = null;

  constructor(public _token: string) {
    const node = Parser().parse(this._token);
    this._node = Object.assign({}, <>{node}</>, clonePrototypeFunctions(this), this);
    return this._node;
  }

  interpolate(tokens: TranslationReplaceables<string | TokenReplacer>): this {
    Object.keys(tokens).forEach((key) => {
      this._token = this._token.replaceAll(
        new RegExp(`{{${key}}}`, "ig"),
        (typeof tokens[key] === "function"
          ? ReactDOMServer.renderToString((tokens[key] as TokenReplacer)() as ReactElement).toString()
          : tokens[key])! as string,
      );
    });
    return this.toReactNode();
  }

  toString(): string {
    return this._token;
  }

  toReactNode(): React.ReactNode & this {
    const node = Parser().parse(this._token);
    this._node = Object.assign({}, <>{node}</>, clonePrototypeFunctions(this), this);
    return this._node;
  }
}

export class TranslationService {
  protected static _singleton: TranslationService;

  protected $languageChanged: ReplaySubject<Language> = new ReplaySubject(1);

  public getCurrentLanguage(): Observable<Language> {
    return this.$languageChanged.asObservable();
  }

  private static get STORAGE_KEY() {
    return "LANGUAGE";
  }

  private currentLanguage: Language = Language.ENGLISH;
  private languageSource: Translation = LANGUAGES[Language.ENGLISH];

  public getLanguages(): { key: Language; name: string }[] {
    return [
      { key: Language.ENGLISH, name: LANGUAGES[Language.ENGLISH].languageName },
      { key: Language.FRENCH, name: LANGUAGES[Language.FRENCH].languageName },
    ];
  }

  public setLanguage(newLang: Language) {
    this.currentLanguage = newLang;
    this.languageSource = LANGUAGES[newLang];
    this._kvStore.setItem(TranslationService.STORAGE_KEY, newLang);
    this.$languageChanged.next(newLang);
  }

  public getLanguage(): Language {
    return Language[this.currentLanguage];
  }

  public getLanguageName(key: Language) {
    return LANGUAGES[key]["languageName"];
  }

  public getTranslationByCompoundKey(key: string): string {
    const parts: string[] = key.split(".");
    let pointer: TraversableObject = this.languageSource[parts[0] as keyof Translation] as TraversableObject;
    let i = 1;
    while (i < parts.length) {
      if (!(parts[i] in (pointer as ObjectWithStringKeysAndValues))) {
        return `[${key}]`;
      }
      pointer = (pointer as ObjectWithStringKeysAndValues)[parts[i]] as TraversableObject;
      i++;
    }
    return pointer as string;
  }

  public resolve(key: string): React.ReactNode & TranslationToken {
    return new TranslationToken(this.getTranslationByCompoundKey(key)).toReactNode();
  }

  constructor(protected _kvStore: Storage) {
    if (this._kvStore.getItem(TranslationService.STORAGE_KEY)) {
      const languageToSet = localStorage.getItem(TranslationService.STORAGE_KEY) as Language;
      this.setLanguage(languageToSet);
    } else {
      if (/^fr\b/.test(navigator.language)) {
        this.setLanguage(Language.FRENCH);
      } else {
        this.setLanguage(Language.ENGLISH);
      }
    }
  }

  static get instance() {
    if (!this._singleton) {
      this._singleton = new TranslationService(window["localStorage"] as Storage);
    }
    return this._singleton;
  }
}
