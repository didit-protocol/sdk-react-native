/**
 * The identifier formats of the Bank Link contract.
 *
 * `fixtures/bank-link-formats.json` is a byte-for-byte copy of
 * `docs/bank-data/link-contract/formats.json` in the verification service: the
 * one file that pins every identifier the backend hands a client. The web SDK
 * once rejected a real resume code because its own expression was stricter than
 * the backend's and split on the dot, which broke the bank return on staging.
 *
 * Each example passes unchanged through presentation and return URLs. Only
 * the fields defined for an event may reach an event listener.
 */

jest.mock('../NativeSdkReactNative', () => ({
  __esModule: true,
  default: {
    startVerification: jest.fn(),
    startVerificationWithWorkflow: jest.fn(),
    onTransactionUpdated: jest.fn(() => ({ remove: jest.fn() })),
    presentBankLink: jest.fn(),
    resumeBankLink: jest.fn(),
    handleBankLinkReturn: jest.fn(),
    onBankLinkEvent: jest.fn(),
  },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import NativeSdkReactNative from '../NativeSdkReactNative';
import {
  presentBankLink,
  onBankLinkEvent,
  handleBankLinkReturn,
} from '../index';

interface Format {
  name: string;
  description: string;
  travels: string[];
  pattern: string;
  example: string;
  fields?: string[];
}

interface Address {
  name: string;
  address: string;
  where: string;
  params: {
    name: string;
    required: boolean;
    format?: string;
    pattern?: string;
  }[];
}

interface Formats {
  version: number;
  formats: Format[];
  addresses: Address[];
}

const contract = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'bank-link-formats.json'), 'utf8')
) as Formats;

const present = NativeSdkReactNative.presentBankLink as jest.Mock;
const handleReturn = NativeSdkReactNative.handleBankLinkReturn as jest.Mock;

const formats = contract.formats.filter(
  (format) => typeof format.example === 'string'
);

/** The address the bank sends the person back to, with the resume code in it. */
function returnAddress(where: 'query' | 'fragment', code: string): string {
  const params = `didit_resume=${encodeURIComponent(code)}`;
  return where === 'query'
    ? `https://app.example.com/bank/return?${params}`
    : `https://app.example.com/bank/return#${params}`;
}

/**
 * The Codegen `EventEmitter` is a function property of the TurboModule, so the
 * fake keeps the handler the wrapper registers and the test emits through it.
 */
let nativeHandler: ((raw: string) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  nativeHandler = null;
  (NativeSdkReactNative.onBankLinkEvent as jest.Mock).mockImplementation(
    (handler: (raw: string) => void) => {
      nativeHandler = handler;
      return {
        remove: () => {
          if (nativeHandler === handler) {
            nativeHandler = null;
          }
        },
      };
    }
  );
  present.mockResolvedValue(JSON.stringify({ type: 'exit', reason: 'closed' }));
});

describe('the copied contract file', () => {
  it('pins the formats the issue names', () => {
    expect(contract.version).toBe(1);
    expect(contract.formats.map((format) => format.name)).toEqual(
      expect.arrayContaining([
        'link_id',
        'url_token',
        'client_token',
        'resume_code',
        'state',
        'link_ref',
        'instance_id',
        'error_code',
      ])
    );
  });

  it('keeps the dot in the resume code, and the address it travels in', () => {
    const resumeCode = contract.formats.find(
      (format) => format.name === 'resume_code'
    ) as Format;

    expect(resumeCode.example).toContain('.');
    expect(resumeCode.travels).toEqual(
      expect.arrayContaining(['query', 'fragment'])
    );
    expect(contract.addresses.map((address) => address.name)).toEqual([
      'sdk_handoff',
      'hosted_return',
    ]);
  });

  it('gives the full-page handoff its resume code and instance id', () => {
    const handoff = contract.addresses.find(
      (address) => address.name === 'sdk_handoff'
    ) as Address;
    const hostedReturn = contract.addresses.find(
      (address) => address.name === 'hosted_return'
    ) as Address;

    expect(handoff.params.map((param) => param.name)).toEqual(
      expect.arrayContaining(['resume_code', 'instance_id', 'v'])
    );
    expect(handoff.where).toBe('fragment');
    expect(hostedReturn.params.map((param) => param.name)).toEqual([
      'didit_resume',
    ]);
    expect(hostedReturn.where).toBe('query');
  });
});

describe('every example of the contract file', () => {
  it.each(formats.map((format) => [format.name, format] as const))(
    'is accepted as the token of %s, unchanged',
    async (_name, format) => {
      await presentBankLink(format.example);

      expect(present).toHaveBeenLastCalledWith(
        format.example,
        expect.anything()
      );
    }
  );

  it.each(formats.map((format) => [format.name, format] as const))(
    'survives the return address of %s, in the query and the fragment',
    (_name, format) => {
      for (const where of ['query', 'fragment'] as const) {
        const url = returnAddress(where, format.example);

        handleBankLinkReturn(url);

        expect(handleReturn).toHaveBeenLastCalledWith(url);
        // The dot is what a stricter parser splits on and loses the rest of.
        const [forwarded] =
          handleReturn.mock.calls[handleReturn.mock.calls.length - 1];
        expect(forwarded).toContain(encodeURIComponent(format.example));
      }
    }
  );

  it('keeps credentials and unrelated fields out of event payloads', () => {
    const fields = Object.fromEntries(
      formats.map((format) => [format.name, format.example])
    );
    const listener = jest.fn();
    const stop = onBankLinkEvent(listener);
    nativeHandler?.(
      JSON.stringify({
        name: 'opened',
        payload: {
          ...fields,
          session: fields.session_credential,
          mode: { token: fields.client_token },
        },
      })
    );
    stop();
    expect(listener).toHaveBeenCalledWith({
      name: 'opened',
      payload: { link_id: fields.link_id },
    });
  });
});
