import { FC, useEffect, useState } from 'react';
import I18 from '../../../i18n/component';
import { useLanguageHook } from '../../../services/config.services';
import { formatClass, getEnvConfig, useSafeLink } from '../../../tools';
import ComConLogo from '../control/logo';
import ComConButton from '../control/button';
import ComConSelector from '../control/selector';
import { BehaviorSubject } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { Link } from 'react-router-dom';
import ComConSvg from '../control/icon';
import useGetDispatch from '../../../databases/hook';
import { InRootState } from '../../../@types/redux';

const ComLayHeader: FC<{ headerBg: boolean }> = ({ headerBg }) => {
  const webConfig = getEnvConfig;
  const goLink = useSafeLink();
  const [language, setLanguage] = useLanguageHook();
  const [wallet] = useGetDispatch<InRootState['wallet']>('wallet');
  const [menuObserver] = useState(new BehaviorSubject<boolean>(true));
  const [menuShow, setMenuShow] = useState(true);

  const changeLanguage = (type: number) => {
    const languageType = ['en-US', 'zh-CN'][type] as typeof language;
    setLanguage(languageType);
  };

  const changeMenuShow = () => {
    menuObserver.next(!menuShow);
  }

  const buttonWalletSignIn = () => {
    if (wallet.hasWallet) goLink('/wallet/account');
    else goLink('/wallet/login');
  };

  useEffect(() => {
    menuObserver.pipe(throttleTime(1000)).subscribe(setMenuShow);
  }, [setMenuShow, menuObserver]);

  return (
    <header className={formatClass(['layout-header', headerBg && 'layout-header-bg'])}>
      <div className={formatClass(['layout-header-inner'])}>
        <ComConLogo
          className={formatClass(['layout-header-logo'])}
          link="/"
          src={require('../../../assets/logo/chain-full-dark.png')} />
        <div className={formatClass(['layout-header-menu', 'layout-header-pc'])}>
          <ul className={formatClass(['layout-header-menu-ul'])}>
            <li className={formatClass(['layout-header-menu-list'])}><Link to="/"><I18 text="home" /></Link></li>
            <li className={formatClass(['layout-header-menu-list'])}><Link to="/"><I18 text="blockChain" /></Link></li>
            {
              wallet.hasWallet && webConfig.deployType === 'test' && <li className={formatClass(['layout-header-menu-list'])}><Link to="/wallet/receive"><ComConSvg xlinkHref="#icon-water" /></Link></li>
            }
          </ul>
          <ComConButton onClick={buttonWalletSignIn}>
            <I18 text={wallet.hasWallet ? 'wallet' : 'signIn'} />
          </ComConButton>
          <ComConSelector
            className="layout-header-menu-language"
            select={{'en-US': 0, 'zh-CN': 1}[language]}
            options={[
              <I18 text="enUS" />,
              <I18 text="zhCN" />
            ]}
            onSelfSelect={changeLanguage} />
        </div>
        <div className={formatClass(['layout-header-menu', 'layout-header-phone'])}>
          <ComConButton onClick={buttonWalletSignIn} className={formatClass(['layout-header-phone-create'])}>
            <I18 text={wallet.hasWallet ? 'wallet' : 'signIn'} />
          </ComConButton>
          <button
            onClick={changeMenuShow}
            className={formatClass(['layout-header-phone-change'])}>
            {
              menuShow ? (
                <ComConSvg className={formatClass(['layout-header-phone-icon', 'layout-header-phone-menu'])} xlinkHref="#icon-ego-menu" />
              ) : (
                <ComConSvg className={formatClass(['layout-header-phone-icon', 'layout-header-phone-close'])} xlinkHref="#icon-close" />
              )
            }
          </button>
          <div className={formatClass(['layout-header-phone-fix', !menuShow && 'layout-header-phone-fix-show'])}>
            {/* <div className={formatClass(['layout-header-phone-accounts'])}>
              <ComConButton className={formatClass(['layout-header-phone-create'])}>
                <I18 text="createAccount" />
              </ComConButton>
              <ComConButton className={formatClass(['layout-header-phone-sign'])}>
                <I18 text="signIn" />
              </ComConButton>
            </div> */}
            <ul className={formatClass(['layout-header-menu-ul'])}>
              <li className={formatClass(['layout-header-menu-list'])}><Link to="/"><I18 text="home" /></Link></li>
              <li className={formatClass(['layout-header-menu-list'])}><Link to="/"><I18 text="blockChain" /></Link></li>
              {/* <li className={formatClass(['layout-header-menu-list'])}><Link to="/"><I18 text="wallet" /></Link></li> */}
              <li className={formatClass(['layout-header-menu-list'])}>
                <div className={formatClass(['layout-header-phone-language'])}>
                  <p className={formatClass(['layout-header-phone-language-title'])}>
                    <I18 text="language" />
                    </p>
                  <button className={formatClass(['layout-header-phone-options', language === 'en-US' && 'layout-header-phone-selected'])} onClick={() => changeLanguage(0)}>
                    <I18 text="enUS" />
                  </button>
                  <button className={formatClass(['layout-header-phone-options', language === 'zh-CN' && 'layout-header-phone-selected'])} onClick={() => changeLanguage(1)}>
                    <I18 text="zhCN" />
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ComLayHeader;
