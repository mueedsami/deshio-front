declare global {
  interface Window {
    qz: {
      version?: string;
      websocket: {
        connect: (config?: { host?: string; port?: number }) => Promise<void>;
        disconnect: () => Promise<void>;
        isActive: () => boolean;
      };
      printers: {
        find: () => Promise<string[]>;
        getDefault: () => Promise<string>;
        details: (printer: string) => Promise<any>;
      };
      configs: {
        create: (printer: string | null, options?: any) => any;
      };
      print: (config: any, data: string[] | any[]) => Promise<void>;
      security?: {
        setCertificatePromise: (certPromise: Promise<string>) => void;
        setSignaturePromise: (signPromise: (toSign: string) => Promise<string>) => void;
      };
    };
  }
}

export {};