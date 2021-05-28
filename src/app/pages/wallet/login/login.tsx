import { FC, useEffect, useState } from 'react';
import ComponentsLayoutBase from '../../../components/layout/base';
import I18 from '../../../../i18n/component';
import useI18 from '../../../../i18n/hooks';

import './login.scss';
import { Link } from 'react-router-dom';
import ComConSvg from '../../../components/control/icon';
import ComConButton from '../../../components/control/button';
import { useSafeLink } from '../../../../tools';
import useGetDispatch from '../../../../databases/hook';
import { InRootState } from '../../../../@types/redux';
import { timer } from 'rxjs';
import { changeWallet } from '../../../../databases/store/wallet';

const PageWalletLogin: FC = () => {
  const goLink = useSafeLink();
  const [wallet, setWallet] = useGetDispatch<InRootState['wallet']>('wallet');
  const textAreaPlaceholder = useI18('inputWordPlaceholder');
  const passwordText = useI18('passwordTip');
  const [signInIng, setSignInIng] = useState(false);
  const [wordText, setWordText] = useState('');
  const [areaFocus, setAreaFocus] = useState(false);
  const [inputType, setInputType] = useState<'password'|'text'>('password');
  const [password, setPassword] = useState('');

  const changeInputType = () => {
    setInputType(status => status === 'text' ? 'password' : 'text');
  };

  const login = () => {
    const words = wordText.split(/[^a-zA-Z]+/g).filter(item => Boolean(item));
    console.log(words);
    setSignInIng(true);
    timer(1000).subscribe(() => {
      setWallet({
        type: changeWallet,
        data: {
          hasWallet: true,
          address: '0x1f8dec5061b0d9bf17e5828f249142b39dab84b4'
        }
      });
    });
  };

  useEffect(() => {
    if (wallet.hasWallet) goLink('/wallet/account');
  }, [goLink, wallet]);
  

  return (
    <ComponentsLayoutBase className="wallet_login_page">
      <h2 className="wallet_title"><I18 text="signInToYourAccount" /></h2>
      <textarea
        className="wallet_login_area"
        placeholder={textAreaPlaceholder + (areaFocus ? '\n\n/[^a-zA-Z]+/g' : '')}
        name="word"
        id="wordInput"
        value={wordText}
        onChange={e => setWordText(e.target.value)}
        onBlur={() => setAreaFocus(false)}
        onFocus={() => setAreaFocus(true)}></textarea>
      <p className="wallet_password_tip_top"><I18 text="password" /><span className="wallet_password_important">*</span></p>
      <div className="wallet_password_box">
        <input
          className="wallet_password_input"
          placeholder={inputType === 'text' ? '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$/' : passwordText}
          type={inputType}
          value={password}
          onChange={e => setPassword(e.target.value)} />
        <button className="wallet_password_change" onClick={changeInputType}>
          <ComConSvg className="wallet_password_icon" xlinkHref={inputType === 'text' ? '#icon-show' : '#icon-hide'} />
        </button>
      </div>
      <div className="wallet_buttons">
        <ComConButton
          loading={signInIng}
          className="wallet_button"
          disabled={signInIng}
          onClick={login}>
          <I18 text="signIn" />
        </ComConButton>
        <button className="wallet_button">
          <I18 text="noExistingONPAccount" />
          <Link className="wallet_button_primary" to="./create"><I18 text="createAccount" /></Link>
        </button>
      </div>
    </ComponentsLayoutBase>
  );
};

export default PageWalletLogin;
