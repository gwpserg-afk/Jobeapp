import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Constrain the web preview to a 375px mobile viewport, centered in the browser */}
        <style dangerouslySetInnerHTML={{ __html: mobileConstraintStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const mobileConstraintStyles = `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
  background-color: #0a0a0a;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

body > div:first-child {
  width: 375px !important;
  max-width: 375px !important;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background-color: #ffffff;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.6);
}

@media (prefers-color-scheme: dark) {
  body > div:first-child {
    background-color: #000000;
  }
}
`;
