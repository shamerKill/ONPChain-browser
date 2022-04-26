import { EncodeObject, DirectSecp256k1HdWallet, DirectSecp256k1HdWalletOptions, makeSignDoc, makeSignBytes } from '@shamer.lib/proto-signing';
import { SigningStargateClient, accountFromAny, Account, StdFee } from '@cosmjs/stargate';
import minimal from 'protobufjs/minimal';
import base64js from 'base64-js';
import { QueryAccountResponse } from '@cosmjs/stargate/build/codec/cosmos/auth/v1beta1/query';
import { TxRaw } from '@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx';
import { MsgDelegate, MsgUndelegate, MsgBeginRedelegate } from '@cosmjs/stargate/build/codec/cosmos/staking/v1beta1/tx';
import { MsgWithdrawDelegatorReward } from '@cosmjs/stargate/build/codec/cosmos/distribution/v1beta1/tx';
import { fetchData } from './ajax';
import getEnvConfig from './env-config';
import { randomNumber } from './random-num';
import { toHex } from './string';
import { BehaviorSubject, Subscription, timer, zip } from 'rxjs';
import { take as RxTake } from 'rxjs/operators';
import { changeSeconds } from './time';
import { accountFromBaseAccount, accountPubKeyFormat } from './cosmo.copy';
import { EthAccount } from './proto/ethermint/types/v1/account';
import { Int53 } from '@cosmjs/math';
import { makeAuthInfoBytes } from '@cosmjs/proto-signing';
import { fromBase64 } from '@cosmjs/encoding';
import { PubKey } from './proto/crypto/v1/ethsecp256k1/keys';
import { Any } from '@cosmjs/proto-signing/build/codec/google/protobuf/any';
import { Secp256k1 } from '@cosmjs/crypto';
// eslint-disable-next-line
import { keccak_256 } from '@noble/hashes/sha3';

const rpcURI = getEnvConfig.WALLET_RPC_BASE;
const appTokenName = getEnvConfig.APP_TOKEN_NAME;
const addressPrefix = getEnvConfig.WALLET_ADDRESS_PREFIX;
const chainId = getEnvConfig.APP_CHAIN_ID;

const defaultTransGasLimit = '200000';
const defaultDelegateLimit = '400000';


let chainAllValue: number;
let chainAllPledged: number;
let chainYearAddRate: number;
const computeRate = (nodeRate: number) => {
  if (chainAllValue && chainAllPledged && chainYearAddRate)
    return parseFloat((chainAllValue * ( chainYearAddRate * (1 - nodeRate) ) / chainAllPledged).toFixed(4)) * 100;
  else
    return 0;
};
export const walletChainReward = (nodeRate: number) => new Promise(resolve => {
  if (!chainAllValue || !chainAllPledged || !chainYearAddRate) zip([
    fetchData('GET', `${getEnvConfig.WALLET_RPC_QUERY}/minting/inflation`),
    fetchData('GET', 'coin_info'),
  ]).subscribe(([ mint, coin ]) => {
    if (mint.success && coin.success) {
      chainAllValue = parseFloat(`${coin.data.supply}`);
      chainAllPledged = parseFloat(`${coin.data.staking}`);
      chainYearAddRate = parseFloat(`${mint.data}`);
      resolve(computeRate(nodeRate).toFixed(2));
    }
  });
  else resolve(computeRate(nodeRate).toFixed(2));
});

export const walletVerifyAddress = (address: string) => {
  if (walletVerifyUserAdd(address)) return `/addressDetail?id=${address}`;
  else if (walletVerifyVerAdd(address)) return `/communityVerifierDetail?id=${address}`;
  else return '';
};
export const walletVerifyUserAdd = (address: string) => (new RegExp(`^${addressPrefix}[\\d|a-z|A-Z]{39}$`)).test(address);
export const walletVerifyVerAdd = (address: string) => (new RegExp(`^${addressPrefix}valoper[\\d|a-z|A-Z]{39}$`)).test(address);

export const walletVerifyMnemonic = async (mnemonics: string[]) => {
  if (![ 12, 15, 18, 21, 24 ].includes(mnemonics.length)) return false;
  try {
    await walletFormMnemonic(mnemonics.join(' '));
    return true;
  } catch (err) {
    return false;
  }
};

export const walletCreate = async () => {
  const newWallet = await DirectSecp256k1HdWallet.generate(12, { prefix: addressPrefix, accountType: 'evm' });
  return newWallet;
};

export const walletEncode = async (wallet: DirectSecp256k1HdWallet, password: string) => {
  const encodeStr = await wallet.serialize(password);
  return encodeStr;
};

export const walletDecode = async (encodeStr: string, password: string) => {
  const backWallet = await DirectSecp256k1HdWallet.deserialize(encodeStr, password);
  return backWallet;
};

export const walletToAddress = async (wallet: DirectSecp256k1HdWallet) => {
  const [ { address } ] = await wallet.getAccounts();
  return address;
};

export const walletToMnemonic = async (wallet: DirectSecp256k1HdWallet) => wallet.mnemonic;

export const walletFormMnemonic = async (mnemonic: string, options?: Partial<DirectSecp256k1HdWalletOptions>) => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: addressPrefix, accountType: 'evm', ...options });
  return wallet;
};

export const walletGetOffline = async (wallet: DirectSecp256k1HdWallet) => {
  const client = await SigningStargateClient.offline(wallet as any);
  return client;
};

export const walletAddressToHex = (address: string) => toHex(minimal.Writer.create().uint32(10).string(address).finish());

export const walletGetAccountInfo = async (wallet: DirectSecp256k1HdWallet) => new Promise<Account>((resolve, reject) => {
  (async () => {
    const address = await walletToAddress(wallet);
    walletFetch('abci_query', {
      path: '/cosmos.auth.v1beta1.Query/Account',
      data: walletAddressToHex(address),
      height: undefined,
      prove: false,
    }).subscribe(({ error, success, data, message }) => {
      if (success && data.response.code === 0) {
        const reader = new minimal.Reader(base64js.toByteArray(data.response.value));
        const decodeData = QueryAccountResponse.decode(reader).account;
        if (decodeData && decodeData.typeUrl === '/ethermint.types.v1.EthAccount') {
          let account = EthAccount.decode(decodeData.value);
          let demo = accountFromBaseAccount(account.baseAccount);
          resolve(demo);
        } else if (decodeData) resolve(accountFromAny(decodeData));
        else reject(data.response);
      } else if (success && data.response.code !== 0) reject(data.response);
      if (error) reject(message);
    });
  })();
});

export const walletSign = async ({ wallet, messages, fee, memo = '' }:
  { wallet: DirectSecp256k1HdWallet, messages: readonly EncodeObject[], fee: StdFee, memo?: string }) => {
  const account = await walletGetAccountInfo(wallet);
  const walletClient = await walletGetOffline(wallet);
  let result: TxRaw;
  // 重写转账签名方法
  if ((await wallet.getAccounts())[0].algo === 'eth_secp256k1') {
    const memPubkey = Uint8Array.from([ 10, 33, ...(await wallet.getAccounts())[0].pubkey ]);
    const accountPubKey = account.pubkey || accountPubKeyFormat(memPubkey);
    const [ accountNumber, sequence ] = [ account.accountNumber, account.sequence ];
    const pubkeyProto = PubKey.fromPartial({
      key: fromBase64(accountPubKey.value),
    });
    const pubkey = Any.fromPartial({
      typeUrl: '/ethermint.crypto.v1.ethsecp256k1.PubKey',
      value: pubkeyProto.key,
    });
    const txBodyEncodeObject = {
      typeUrl: '/cosmos.tx.v1beta1.TxBody',
      value: {
        messages: messages,
        memo: memo,
      },
    };
    const txBodyBytes = walletClient.registry.encode(txBodyEncodeObject);
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    const authInfoBytes = makeAuthInfoBytes(
      [ pubkey ], fee.amount, gasLimit, sequence,
    );
    const signDoc = makeSignDoc(
      txBodyBytes, authInfoBytes, chainId, accountNumber,
    );
    const signBytes = makeSignBytes(signDoc);
    const hashedMessage = keccak_256(signBytes);
    const accounts = (await (wallet as any).getAccountsWithPrivkeys());
    const signatureA = await Secp256k1.createSignature(hashedMessage, accounts[0].privkey);
    const signatureBytes = new Uint8Array([ ...signatureA.r(32), ...signatureA.s(32), (signatureA.recovery + 27) ]);
    result = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [ signatureBytes ],
    });
  } else result = await (walletClient.sign(
    account.address, [ ...messages ], fee, memo, { accountNumber: account.accountNumber, sequence: account.sequence, chainId: chainId },
  ));
  const raw = TxRaw.encode(result).finish();
  const rawTx = base64js.fromByteArray(raw);
  return rawTx;
};

export const walletTransfer = ({ wallet, toAddress, volume, gasAll, memo = '', gasLimit = defaultTransGasLimit }:
  { wallet: DirectSecp256k1HdWallet; toAddress: string; volume: string; gasAll: string; memo?: string; gasLimit?: string; }) => {
  const { fetchData, resultObserver } = walletFetchObserve();
  (async () => {
    const account = await walletGetAccountInfo(wallet);
    const inputVolume = walletTokenToAmount(volume);
    const transferMessage: readonly EncodeObject[] = [ {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: account.address,
        toAddress: toAddress,
        amount: [ { amount: inputVolume, denom: appTokenName } ],
      },
    } ];
    const transferFee = walletGetFee('transfer', { allAmount: gasAll, gasLimit: gasLimit });
    const signRaw = await walletSign({ wallet, messages: transferMessage, fee: transferFee, memo });
    fetchData(signRaw);
  })();
  return resultObserver;
};

export const walletCreateToken = ({ wallet, gasAll, memo = '', gasLimit = defaultTransGasLimit }:
  { wallet: DirectSecp256k1HdWallet; gasAll: string; memo?: string; gasLimit?: string; }) => {
  const { fetchData, resultObserver } = walletFetchObserve();
  (async () => {
    const account = await walletGetAccountInfo(wallet);
    const transferMessage: readonly EncodeObject[] = [ {
      typeUrl: '/plugchain.token.MsgIssueToken',
      value: {
        owner: account.address,
        name: 'doit',
        symbol: 'it',
        minUnit: 't',
        initialSupply: '100000000000',
        maxSupply: '100000000000',
        mintable: true,
        scale: 0,
      },
    } ];
    const transferFee = walletGetFee('delegate', { allAmount: gasAll, gasLimit: gasLimit });
    const signRaw = await walletSign({ wallet, messages: transferMessage, fee: transferFee, memo });
    fetchData(signRaw);
  })();
  return resultObserver;
};

export const walletDelegate = ({ wallet, validatorAddress, volume, gasAll, gasLimit = defaultDelegateLimit, reDelegateAddress }:
  { wallet: DirectSecp256k1HdWallet; validatorAddress: string; volume: string; gasAll: string; gasLimit?: string; reDelegateAddress?: string; },
type: 'delegate'|'unDelegate'|'reDelegate'|'withdrawRewards' = 'delegate') => {
  const { fetchData, resultObserver } = walletFetchObserve();
  (async () => {
    const account = await walletGetAccountInfo(wallet);
    const inputVolume = walletTokenToAmount(volume);
    let typeUrl: string;
    let value: any;
    if (type === 'unDelegate') {
      typeUrl = '/cosmos.staking.v1beta1.MsgUndelegate';
      value = MsgUndelegate.fromPartial({
        delegatorAddress: account.address,
        validatorAddress: validatorAddress,
        amount: { amount: inputVolume, denom: appTokenName },
      });
    } else if (type === 'reDelegate') {
      typeUrl = '/cosmos.staking.v1beta1.MsgBeginRedelegate';
      value = MsgBeginRedelegate.fromPartial({
        delegatorAddress: account.address,
        validatorSrcAddress: validatorAddress,
        validatorDstAddress: reDelegateAddress,
        amount: { amount: inputVolume, denom: appTokenName },
      });
    } else if (type === 'withdrawRewards') {
      typeUrl = '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward';
      value = MsgWithdrawDelegatorReward.fromPartial({
        delegatorAddress: account.address,
        validatorAddress: validatorAddress,
      });
    } else {
      typeUrl = '/cosmos.staking.v1beta1.MsgDelegate';
      value = MsgDelegate.fromPartial({
        delegatorAddress: account.address,
        validatorAddress: validatorAddress,
        amount: { amount: inputVolume, denom: appTokenName },
      });
    }
    const transferMessage: readonly EncodeObject[] = [ {
      typeUrl: typeUrl,
      value: value,
    } ];
    const transferFee = walletGetFee('delegate', { allAmount: gasAll, gasLimit: gasLimit });
    const signRaw = await walletSign({ wallet, messages: transferMessage, fee: transferFee });
    fetchData(signRaw);
  })();
  return resultObserver;
};

export const formatTokenVolume = (volume: string|number, tokenName: string = appTokenName) => {
  let volumeStr = typeof volume === 'number' ? volume.toString() : volume;
  const amount = {
    denom: tokenName,
    amount: volumeStr,
  };
  return amount;
};

const walletFetch = (method: string, params: { [key: string]: any}) => fetchData(
  'POST', rpcURI, {
    jsonrpc: '2.0',
    id: randomNumber(),
    method: method,
    params: params,
  }, true,
);

export const walletAmountToToken = (amount: string): string => (parseInt(amount) / Math.pow(10, 6)).toString();
export const walletTokenToAmount = (token: string): string => (parseFloat(token) * Math.pow(10, 6)).toString();

const walletGetFee = (type: 'transfer'|'delegate', fee?: { allAmount?: string; gasLimit?: string; }): StdFee => {
  let defaultGasLimit = '0';
  let defaultAmount = '0';
  if (fee) {
    if (fee.gasLimit) defaultGasLimit = fee.gasLimit;
    else if ( type === 'transfer' ) defaultGasLimit = defaultTransGasLimit;
    else if ( type === 'delegate' ) defaultGasLimit = defaultDelegateLimit;
    if (fee.allAmount) defaultAmount = walletTokenToAmount(fee?.allAmount || '0');
  }
  let resultFee: StdFee = {
    amount: [ {
      denom: appTokenName,
      amount: defaultAmount,
    } ], gas: defaultGasLimit,
  };
  return resultFee;
};

const walletFetchObserve = () => {
  const resultObserver = new BehaviorSubject<{ result: any; success: boolean; loading: boolean; error: boolean; }>({ result: null, success: false, loading: true, error: false });
  const fetchData = (txRaw: string) => {
    walletFetch('broadcast_tx_async', { tx: txRaw }).subscribe(({ success, data, error, message }) => {
      if (success) resultObserver.next({...resultObserver.getValue(), result: data});
      if (error) resultObserver.next({...resultObserver.getValue(), result: message, error: true, loading: false});
    });
    let watchLoading: Subscription|null = null;
    const resultSubscription = resultObserver.subscribe(({ loading, result, success, error }) => {
      if (loading && result && result.code === 0 && result.hash) watchLoading = timer(0, changeSeconds(3)).pipe(RxTake(15)).subscribe(lengthTimer => {
        walletFetch('tx_search', { query: `tx.hash='${result.hash}'`, page: '1', prove: false }).subscribe(search => {
          if (search.success && search.data.total_count !== '0') {
            if (search.data.txs?.[0]?.tx_result?.code !== 0) resultObserver.next({error: true, result: search.data.txs?.[0]?.tx_result?.log, loading: false, success: false});
            else resultObserver.next({error: false, result: search.data.txs, loading: false, success: true});
            watchLoading?.unsubscribe();
            resultSubscription.unsubscribe();
          }
          if (!search.loading && lengthTimer === 14) {
            resultObserver.next({error: true, result: '', loading: false, success: false});
            watchLoading?.unsubscribe();
            resultSubscription.unsubscribe();
          }
        });
      });
      else if (success) {
        if (watchLoading) watchLoading.unsubscribe();
        resultSubscription.unsubscribe();
      } else if (error) {
        if (watchLoading) watchLoading.unsubscribe();
        resultSubscription.unsubscribe();
      }
    });
  };
  return { resultObserver, fetchData };
};