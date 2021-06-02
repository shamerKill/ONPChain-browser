import getEnvConfig from './env-config';
import { BehaviorSubject, Observable } from 'rxjs';
import { useRef } from 'react';

export type TypeAjaxResult<T = any> = {
  loading: boolean;
  success: boolean;
  error: boolean;
  status?: number;
  data?: T;
  message?: string;
}

type TypeQuery = { [key: string]: any };

const formatUrl = (url: string, query?: TypeQuery): string => {
  let pathName = '';
  if (/^http(s?):\/\//.test(url)) pathName = url;
  else pathName = `${getEnvConfig.BASE_URL}/${url}`.replace(/(?<!:)\/{2,}/g, '/');
  if (query !== undefined) {
    const queryStr = Object.keys(query).map(key => `${key}=${JSON.stringify(query[key])}`);
    pathName += `?${queryStr.join('&')}`;
  }
  return pathName;
};

const fetchOptions: { [key: string]: string } = {
  // credentials: 'include',
};

export const fetchData = <T = any>(type: 'GET'|'POST', url: string, query?: TypeQuery, rpc = false) => {
  const status: TypeAjaxResult<T> = {
    loading: false,
    success: false,
    error: false,
  };
  const getObservable = new BehaviorSubject(status);
  fetch(formatUrl(url, type === 'GET' ? query : undefined), {
    ...fetchOptions,
    method: type,
    body: (() => {
      // 格式化post请求数据
      if (type === 'GET') return undefined;
      if (rpc) return JSON.stringify(query);
      if (!query) return null;
      const fm = new FormData();
      for (let key in query) fm.append(key, query[key]);
      return fm;
    })(),
  }).then(blob => {
    try {
      return blob.json();
    } catch (err) {
      blob.text().then(text => {
        getObservable.next({
          loading: false,
          success: false,
          error: true,
          message: text,
        });
      });
    }
  })
    .then(result => {
      if (result.error) getObservable.next({
        loading: false,
        success: false,
        error: true,
        status: result.error.code || 500,
        data: result.error.data || '',
        message: result.error.message || 'error',
      });
      if (result.result) getObservable.next({
        loading: false,
        success: true,
        error: false,
        status: result.status || 200,
        data: result.data || result.result,
        message: result.message || 'success',
      });
    })
    .catch(err => {
      getObservable.next({
        loading: false,
        success: false,
        error: true,
        message: err.message,
      });
    });
  return getObservable;
};

export const useAjaxGet = <T = any>(url: string, query?: TypeQuery) => {
  const memResult = useRef(fetchData<T>(
    'GET', url, query,
  ));
  return memResult.current;
};
export const useAjaxPost = <T = any>(url: string, query?: TypeQuery) => {
  const memResult = useRef(fetchData<T>(
    'POST', url, query,
  ));
  return memResult.current;
};

export const zipAllSuccess = () => (source: Observable<[TypeAjaxResult<any>]>) => new Observable<[TypeAjaxResult<any>]>(subscriber => {
  const subscription = source.subscribe(data => {
    let allSuccess = true;
    data.forEach(value => {
      if (!value.success) allSuccess = false;
    });
    if (allSuccess) subscriber.next(data);
  });
  return subscription;
});

export const zipAllComplete = () => (source: Observable<[TypeAjaxResult<any>]>) => new Observable<[TypeAjaxResult<any>]>(subscriber => {
  const subscription = source.subscribe(data => {
    let allComplete = true;
    data.forEach(value => {
      if (!value.success && !value.error) allComplete = false;
    });
    if (allComplete) subscriber.next(data);
  });
  return subscription;
});