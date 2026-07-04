declare module 'bestzip' {
  interface ZipOptions {
    cwd?: string;
    destination: string;
    source: string | string[];
    level?: number;
  }

  function zip(options: ZipOptions): Promise<void>;

  function nodeZip(options: ZipOptions): Promise<void>;
  function nativeZip(options: ZipOptions): Promise<void>;
  function hasNativeZip(): boolean;

  export default zip;
  export { zip, nodeZip, nativeZip, hasNativeZip };
}
