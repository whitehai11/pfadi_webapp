export const isNfcSupported = () => "NDEFReader" in window;

export const readNfcTag = async (): Promise<string> => {
  // @ts-ignore
  const reader = new NDEFReader();
  await reader.scan();
  return new Promise((resolve, reject) => {
    reader.addEventListener("reading", (event: any) => {
      const record = event.message.records[0];
      if (!record) return reject(new Error("Kein NFC-Datensatz"));
      const textDecoder = new TextDecoder();
      resolve(textDecoder.decode(record.data));
    });
    reader.addEventListener("readingerror", () => reject(new Error("NFC Lesefehler")));
  });
};

export const writeNfcTag = async (payload: string) => {
  if (!isNfcSupported()) {
    throw new Error("NFC nicht verfügbar");
  }
  // @ts-ignore
  const writer = new NDEFReader();
  await writer.write(payload);
};

export const isIOS = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
};

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // @ts-ignore
  navigator.standalone === true;

export const getBoxTag = (id: string) => `pfadi-box:${id}`;
