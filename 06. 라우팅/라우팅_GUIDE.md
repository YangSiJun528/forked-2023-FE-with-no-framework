# 라우팅 가이드

## 라우팅 개념

SPA(Single Page Application)는 단일 HTML 페이지에서 동적으로 뷰를 다시 그려주며 동작하는 웹 애플리케이션입니다.  
이러한 SPA에서 페이지 전환을 관리하는 기술을 라우팅이라고 합니다.  
라우팅 시스템은 일반적으로 두 가지 핵심 요소를 가집니다.  

- 경로 레지스트리: URL과 해당 URL에 맞는 컴포넌트를 목록으로 관리합니다.  
- URL 리스너: URL 변경을 감지하여 레지스트리에 맞는 컴포넌트를 렌더링합니다.  

이 가이드에서는 세 가지 다른 방식으로 라우터를 구현합니다.  

## 1단계: 프래그먼트 식별자 기반 라우터

URL의 해시(hash, `#`) 부분을 사용하여 클라이언트 사이드에서 경로를 관리하는 방식입니다.  
서버에 요청을 보내지 않고 브라우저 내에서만 경로 변경을 처리할 수 있습니다.  

`01. fragment-version/router.js`:
```javascript
const ROUTE_PARAMETER_REGEXP = /:(\w+)/g;
const URL_FRAGMENT_REGEXP = '([^\\/]+)';

// ...

export default () => {
  const routes = [];
  let notFound = () => {};

  const router = {};

  const checkRoutes = () => {
    const { hash } = window.location;

    const currentRoute = routes.find((route) => {
      return route.testRegExp.test(hash);
    });

    // ... 경로를 찾지 못하면 notFound 실행 ...

    const urlParams = extractUrlParams(currentRoute, hash);
    currentRoute.component(urlParams);
  };

  router.addRoute = (fragment, component) => {
    // ... 경로와 파라미터를 정규식으로 변환하여 routes 배열에 추가 ...
  };

  router.navigate = (fragment) => {
    window.location.hash = fragment;
  };

  router.start = () => {
    window.addEventListener('hashchange', checkRoutes);

    if (!window.location.hash) {
      window.location.hash = '#/';
    }

    checkRoutes();
  };

  return router;
};
```

`router.js`는 `window.location.hash` 값을 확인하고 `hashchange` 이벤트를 수신하여 URL 변경을 감지합니다.  
경로에 `:id`와 같은 파라미터가 포함된 경우, 정규식을 사용하여 값을 추출합니다.

## 2단계: History API 기반 라우터

HTML5 History API를 사용하면 `#` 없이 실제 URL 경로를 사용하는 것처럼 라우팅을 구현할 수 있습니다.  
이는 더 깔끔한 URL을 제공합니다.

`02. history-api-version/router.js`:
```javascript
// ...
const TICKTIME = 250;
const NAV_A_SELECTOR = 'a[data-navigation]';

// ...

export default () => {
  // ...
  let lastPathname;

  const checkRoutes = () => {
    const { pathname } = window.location;
    if (lastPathname === pathname) {
      return;
    }

    lastPathname = pathname;
    // ... 경로를 찾고 컴포넌트 실행 ...
  };

  // ... addRoute, setNotFound ...

  router.navigate = (path) => {
    window.history.pushState(null, null, path);
  };

  router.start = () => {
    checkRoutes();
    window.setInterval(checkRoutes, TICKTIME);

    document.body.addEventListener('click', (e) => {
      const { target } = e;
      if (target.matches(NAV_A_SELECTOR)) {
        e.preventDefault();
        router.navigate(target.href);
      }
    });
  };

  return router;
};
```

History API는 `pushState`로 URL을 변경해도 별도의 이벤트를 발생시키지 않습니다.  
따라서 `setInterval`을 사용하여 `window.location.pathname`의 변경을 주기적으로 확인해야 합니다.  
또한, `<a>` 태그의 기본 동작(페이지 새로고침)을 막기 위해 클릭 이벤트를 가로채 `e.preventDefault()`를 호출해야 합니다.  

## 3단계: Navigo 라이브러리 기반 라우터

마지막으로, 직접 구현하는 대신 Navigo라는 서드파티 라우팅 라이브러리를 사용합니다.  
중요한 점은 `router.js`의 내부 구현만 변경되고, 이 라우터를 사용하는 `index.js` 코드는 전혀 수정되지 않는다는 것입니다.  
이는 라우터의 공용 인터페이스(`addRoute`, `start` 등)를 일관되게 유지했기 때문입니다.  

`03. navigo-library-version/router.js`:
```javascript
export default () => {
  const navigoRouter = new window.Navigo();
  const router = {};

  router.addRoute = (path, callback) => {
    navigoRouter.on(path, callback);
    return router;
  };

  router.setNotFound = (cb) => {
    navigoRouter.notFound(cb);
    return router;
  };

  router.navigate = (path) => {
    navigoRouter.navigate(path);
  };

  router.start = () => {
    navigoRouter.resolve();
    return router;
  };

  return router;
};
```

복잡한 라우팅 로직을 라이브러리에 위임하여 코드가 훨씬 단순해졌습니다.  
이처럼 잘 정의된 인터페이스 뒤로 구현을 숨기는(캡슐화) 것은 코드의 유지보수성을 높이는 좋은 방법입니다.  

