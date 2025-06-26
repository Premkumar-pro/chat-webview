// export {};

// declare global {
//   interface Window {
//     vscode: {
//       postMessage: (message: { type: string; content: string }) => void;
//     };
//   }
// }






// export {};

// declare global {
//   type VSCodeMessage =
//     | { type: 'chat'; content: string }
//     | { type: 'file-request'; filename: string };

//   interface Window {
//     vscode: {
//       postMessage: (message: VSCodeMessage) => void;
//     };
//   }
// }


export {};

declare global {
  interface Window {
    vscode: {
      postMessage: (message:
        | { type: 'chat'; content: string }
        | { type: 'file-request'; filename: string }
      ) => void;
    };
  }
}
