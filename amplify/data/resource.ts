import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { eventStatuses } from '../../src/data';

const schema = a.schema({
  EventStatus: a.enum([...eventStatuses]),
  FestivalEvent: a.model({
    code: a.string().required(),
    artist: a.string().required(),
    space: a.string().required(),
    time: a.string().required(),
    status: a.ref('EventStatus').required(),
  }).authorization(allow => [
    allow.publicApiKey().to(['read']),
    allow.group('Admins'),
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
