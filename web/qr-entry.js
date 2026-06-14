// Build entry (ESM so bun executes it eagerly): exposes the browser QR lib as a global
// for the dashboard's plain <script> tag.
import QRCodeLib from "qrcode/lib/browser.js";
window.QRCode = QRCodeLib;
globalThis.QRCode = QRCodeLib;
