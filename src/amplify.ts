import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

export const client = generateClient<Schema>();

let configurePromise: Promise<void> | undefined;

export function configureAmplify() {
  if (!configurePromise) {
    configurePromise = (async () => {
      const response = await fetch('/amplify_outputs.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`No se encontró amplify_outputs.json (HTTP ${response.status}). Despliega el backend o inicia un sandbox.`);
      }
      const outputs = await response.json();
      Amplify.configure(outputs);
    })().catch(error => {
      configurePromise = undefined;
      throw error;
    });
  }

  return configurePromise;
}
