# translation-service-react

TranslationService for React

## Usage

```typescript

  const ts = TranslationService.instance;

  ...

  ts.setLanguage(value as Language); 

  ...

  <div>{ts.resolve("page_1.title")}</div> // resolves to ReactNode

  ...

  // "value with {{variable}}"
  {ts.resolve("text.with.variable").interpolate({ variable: value }).toString()}

```

## Author

@arpad1337

## License

MIT
