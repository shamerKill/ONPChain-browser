import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import ComConTable, { TypeComConTableContent, TypeComConTableHeader } from '../../../components/control/table.copy';
import ComponentsLayoutBase from '../../../components/layout/base';
import I18 from '../../../../i18n/component';

import './account.scss';
import { formatTime, getEnvConfig, getOnlyId, useFormatPath, useFormatSearch, useSafeReplaceLink } from '../../../../tools';
import ComConSvg from '../../../components/control/icon';
import { justifySearch } from '../../../../tools/url';
import { fetchData } from '../../../../tools/ajax';
import { formatNumberStr } from '../../../../tools/string';
import ComConLink from '../../../components/control/link';

const PageChainAccount: FC = () => {
  const replaceLink = useSafeReplaceLink();
  const search = useFormatSearch<{ page: string }>();
  const [, pathAddress] = useFormatPath();
  const [address, setAddress] = useState('');
  const [coinVolume, setCoinVolume] = useState('');
  // const [marketValue, setMarketValue] = useState('');
  const [transactionVolume, setTransactionVolume] = useState('');
  const [inputVolume, setInputVolume] = useState('');
  const [outputVolume, setOutputVolume] = useState('');

  const [tableHeader, setTableHeader] = useState<TypeComConTableHeader>([]);
  const [tableContent, setTableContent] = useState<TypeComConTableContent>([]);
  const [page, setPage] = useState<number>(0);
  const [allCount, setAllCount] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  const onPageChange = useCallback((num: number) => {
    const searchObj = search || {page: num};
    searchObj.page = `${num}`;
    replaceLink(`?${justifySearch(searchObj)}`);
    setPage(num);
  }, [search, replaceLink]);
  useEffect(() => {
    if (!search) return;
    onPageChange(Number(search.page) || 1);
  }, [search, onPageChange]);

  useEffect(() => {
    setTableHeader(
      [ 'hash', 'blockHeight', 'time', 'from', 'to', 'transactionVolume', 'feeNumber' ]
        .map(text => ({ key: getOnlyId(), value: <I18 text={text} /> }))
    );
  }, []);

  useEffect(() => {
    if (!page || !address || !limit) return;
    setLoading(true);
    const subOption = fetchData('GET', 'address_txs', { address, coin: getEnvConfig.APP_TOKEN_NAME, page, limit }).subscribe(({success, data}) => {
      if (success) {
        setLoading(false);
        setAllCount(parseInt(data.TxNum));
        setTableContent(data.Txs.map((tx: any) => {
          const txTypeOutput = tx.from === address ? true : false;
          return {
            key: getOnlyId(),
            value: [
              { key: getOnlyId(), value: <ComConLink link={`../transaction/${tx.hash}`}>{ tx.hash }</ComConLink> },
              { key: getOnlyId(), value: <ComConLink link={`../block/${tx.block_id}`}>{ tx.block_id }</ComConLink> },
              { key: getOnlyId(), value: formatTime(new Date(tx.create_time)) },
              { key: getOnlyId(), value: <ComConLink noLink={txTypeOutput} link={`../account/${tx.from}`}>{ tx.from }</ComConLink> },
              { key: getOnlyId(), value: <ComConLink noLink={!txTypeOutput} link={`../account/${tx.to}`}>{ tx.to }</ComConLink> },
              { key: getOnlyId(), value: tx.amount },
              { key: getOnlyId(), value: tx.fee },
            ]
          };
        }));
      }
    });
    return () => subOption.unsubscribe();
  }, [page, limit, address]);

  useEffect(() => {
    setAddress(pathAddress);
  }, [pathAddress]);

  useEffect(() => {
    if (address === undefined) return;
    fetchData('GET', 'balance', { address, coin: getEnvConfig.APP_TOKEN_NAME }).subscribe(({ success, data }) => {
      if (success) {
        setCoinVolume(formatNumberStr(`${data.Balance}`));
        setTransactionVolume(formatNumberStr(`${data.TxNum}`));
        setInputVolume(formatNumberStr(`${data.RecipientAmount}`));
        setOutputVolume(formatNumberStr(`${data.SendAmount}`));
      }
    });
  }, [address]);

  return (
    <ComponentsLayoutBase className="page_chain_account">
      <div className="account_info">
        {/* title */}
        <h2 className="account_address">
          <ComConSvg className="account_icon_card" xlinkHref="#icon-card" />
          <I18 text="address" />&nbsp;:&nbsp;&nbsp;{address}
          <button className="account_func">
            <ComConSvg xlinkHref="#icon-copy" />
          </button>
          <button className="account_func">
            <ComConSvg xlinkHref="#icon-qr-code" />
          </button>
        </h2>
        {/* info */}
        <div className="account_info_box">
          <dl className="account_info_dl account_info_important">
            <dt className="account_info_dt"><I18 text="extra" /></dt>
            <dd className="account_info_dd">
              { coinVolume }&nbsp;PLUG
              {/* <span className="account_info_small">≈&nbsp;${marketValue}</span> */}
            </dd>
          </dl>
          <dl className="account_info_dl">
            <dt className="account_info_dt"><I18 text="transactionVolume" /></dt>
            <dd className="account_info_dd">{ transactionVolume }</dd>
          </dl>
          <dl className="account_info_dl">
            <dt className="account_info_dt"><I18 text="outputVolume" /></dt>
            <dd className="account_info_dd">{ outputVolume }</dd>
          </dl>
          <dl className="account_info_dl">
            <dt className="account_info_dt"><I18 text="inputVolume" /></dt>
            <dd className="account_info_dd">{ inputVolume }</dd>
          </dl>
        </div>
      </div>
      <div className="account_table">
        <h2 className="account_title"><I18 text="transactionList" /></h2>
        {useMemo(() => (
          <ComConTable
            showTools
            loading={loading}
            header={tableHeader}
            content={tableContent}
            allCount={allCount}
            page={page}
            limit={limit}
            onPageChange={onPageChange} />
        ), [tableHeader, tableContent, allCount, page, limit, onPageChange, loading])}
      </div>
    </ComponentsLayoutBase>
  );
};

export default PageChainAccount;