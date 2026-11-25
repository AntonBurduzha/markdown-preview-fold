// Entry point of the script the built-in Markdown preview loads (markdown.previewScripts).
import { startPreviewFold } from './app';
import { browserStore, createStorage } from './storage';

startPreviewFold(createStorage(browserStore()));
