import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app');
const require = createRequire(path.join(root, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

function renderConfirmation(invitationToken = null) {
  const auth = { configured: true, recoveryStatus: 'idle', confirmationRequired: true, confirmationEmail: 'alex@example.com', invitationToken };
  const output = ts.transpileModule(fs.readFileSync(path.join(root, 'src/screens/AuthScreen.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const native = (tag) => ({ children, ...props }) => React.createElement(tag, { role: props.role ?? props.accessibilityRole }, children);
  Function('require', 'module', 'exports', output)((id) => {
    if (id === 'react-native') return { View: native('div'), ScrollView: native('div'), Text: native('span'), Pressable: native('button'), TextInput: native('input'), ActivityIndicator: native('progress'), StyleSheet: { create: value => value } };
    if (id === '../features/auth/AuthSessionProvider') return { useAuthSession: () => auth };
    if (id === '../app/queries') return { useInvitationQuery: () => ({ data: invitationToken ? { status: 'ready' } : null }) };
    if (id === '../components/AppBackground') return { AppBackground: native('main') };
    if (id === '../theme/tokens') return { palette: {}, radii: {}, shadow: {}, spacing: {} };
    return require(id);
  }, module, module.exports);
  return renderToStaticMarkup(React.createElement(module.exports.AuthScreen));
}

test('signup completion replaces the form with an email next-step screen', () => {
  const html = renderConfirmation();
  assert.match(html, /Check your email/);
  assert.match(html, /alex@example.com/);
  assert.doesNotMatch(html, /<input|Create account/);
  assert.match(html, /Back to sign in/);
  assert.match(html, /Use a different email/);
  assert.match(html, /already have an account/i);
  assert.doesNotMatch(html, /we (sent|emailed)|message (has been|was) sent/i);
});

test('invited signup keeps the invitation-specific next step', () => {
  const html = renderConfirmation('A'.repeat(43));
  assert.match(html, /return to this invitation and sign in/);
  assert.doesNotMatch(html, /<input/);
});
