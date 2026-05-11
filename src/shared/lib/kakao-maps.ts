import { kakaoMapAppKey } from '../config';

declare global {
  interface Window {
    kakao?: any;
  }
}

let kakaoMapsSdkPromise: Promise<any> | null = null;

function createSdkUrl() {
  const params = new URLSearchParams({
    appkey: kakaoMapAppKey,
    autoload: 'false',
    libraries: 'services',
  });

  return `https://dapi.kakao.com/v2/maps/sdk.js?${params.toString()}`;
}

export async function loadKakaoMapsSdk() {
  if (typeof window === 'undefined') {
    throw new Error('Kakao Maps SDK can only be loaded in the browser.');
  }

  if (!kakaoMapAppKey) {
    throw new Error('VITE_KAKAO_MAP_APP_KEY is missing.');
  }

  if (window.kakao?.maps?.services) {
    return window.kakao;
  }

  if (!kakaoMapsSdkPromise) {
    kakaoMapsSdkPromise = new Promise((resolve, reject) => {
      const initialize = () => {
        if (!window.kakao?.maps?.load) {
          reject(new Error('Kakao Maps SDK failed to initialize.'));
          return;
        }

        window.kakao.maps.load(() => resolve(window.kakao));
      };

      const existingScript = document.querySelector(
        'script[data-kakao-maps-sdk="true"]',
      ) as HTMLScriptElement | null;

      if (existingScript) {
        if (window.kakao?.maps?.load) {
          initialize();
          return;
        }

        existingScript.addEventListener('load', initialize, { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Kakao Maps SDK could not be loaded.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.dataset.kakaoMapsSdk = 'true';
      script.src = createSdkUrl();
      script.addEventListener('load', initialize, { once: true });
      script.addEventListener(
        'error',
        () => reject(new Error('Kakao Maps SDK could not be loaded.')),
        { once: true },
      );
      document.head.appendChild(script);
    }).catch((error) => {
      kakaoMapsSdkPromise = null;
      throw error;
    });
  }

  return kakaoMapsSdkPromise;
}
