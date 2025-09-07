# HTTP 요청 가이드

## 개념

### AJAX

AJAX(Asynchronous JavaScript And XML)는 최초 페이지 로드 후,  
서버로부터 필요한 데이터만 비동기적으로 로드하는 기술입니다.  
과거에는 서버에서 데이터를 가져오려면 전체 페이지를 새로고침해야 했습니다.  
초기에는 데이터 형식으로 XML을 사용했으나 현재는 대부분 JSON을 사용합니다.  

### REST

REST(REpresentational State Transfer)는 웹 서비스를 디자인하는 아키텍처 스타일 중 하나입니다.  
GET, POST, PUT, PATCH, DELETE 같은 HTTP 메서드를 사용하여 자원을 관리합니다.  

## 애플리케이션 구조

이 예제는 간단한 할 일 목록(Todo List) 애플리케이션으로,  
UI, 상태 관리, HTTP 통신 계층이 분리된 구조를 가집니다.  

- `server.js`: Express.js로 작성된 간단한 REST API 서버입니다.  
- `index.html`: 버튼과 결과 표시 영역이 있는 기본 UI입니다.  
- `index.js`: UI 이벤트를 받아 `todos.js`의 함수를 호출합니다.  
- `todos.js`: 애플리케이션의 데이터 처리 로직과 HTTP 요청을 담당하는 중간 계층입니다.  
- `httpUsing...js`: 실제 HTTP 통신을 수행하는 클라이언트 구현체들입니다.  

`todos.js`는 HTTP 클라이언트 구현체를 직접 노출하지 않고,  
`list`, `create`, `update`, `delete`와 같은 메서드를 제공하여 캡슐화합니다.  

`todoList/todos.js`:
```javascript
import http from "./httpUsingXMLHttpRequest.js";

const HEADERS = {
  "Content-Type": "application/json",
};

const BASE_URL = "/api/todos";

const list = () => http.get(BASE_URL);

const create = (text) => {
  const todo = {
    text,
    completed: false,
  };
  return http.post(BASE_URL, todo, HEADERS);
};

// ... update, delete ...

export default {
  list,
  create,
  // ...
};
```

## HTTP 클라이언트 구현

`todos.js`가 사용하는 `http` 객체는 동일한 인터페이스를 가진 여러 구현체로 교체될 수 있습니다.  
모든 구현체는 `get`, `post`, `put`, `patch`, `delete` 메서드를 가집니다.  

### 1. XMLHttpRequest 사용

전통적인 콜백 기반의 API를 프로미스(Promise)로 감싸서 사용합니다.  

`todoList/httpUsingXMLHttpRequest.js`:
```javascript
const request = (params) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const { method = "GET", url, headers = {}, body } = params;

    xhr.open(method, url);

    // ... setHeaders, send ...

    xhr.onerror = () => {
      reject(new Error("HTTP Error"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Timeout Error"));
    };

    xhr.onload = () => resolve(parseResponse(xhr));
  });
};

// ... get, post, put, patch, delete ...
```

### 2. Fetch API 사용

최신 브라우저에 내장된 프로미스 기반의 API입니다.  

`todoList/httpUsingFetch.js`:
```javascript
const request = async (params) => {
  const { method = "GET", url, headers = {}, body } = params;

  const config = {
    method,
    headers: new window.Headers(headers),
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await window.fetch(url, config);

  return parseResponse(response);
};

// ... get, post, put, patch, delete ...
```

### 3. Axios 사용

브라우저와 Node.js 환경 모두에서 사용할 수 있는 인기 있는 프로미스 기반 라이브러리입니다.  

`todoList/httpUsingAxios.js`:
```javascript
const request = async (params) => {
  const { method = "GET", url, headers = {}, body } = params;

  const config = {
    url,
    method,
    headers,
    data: body,
  };

  return axios(config);
};

// ... get, post, put, patch, delete ...
```

## 구현 변경하기

`todos.js` 파일에서 `import` 구문 한 줄만 수정하면 HTTP 클라이언트 구현을 쉽게 변경할 수 있습니다.  
이는 인터페이스를 기반으로 프로그래밍했기 때문에 가능합니다.  

```javascript
// 아래 셋 중 원하는 구현체를 선택하여 주석을 해제합니다.
// import http from "./httpUsingXMLHttpRequest.js";
// import http from "./httpUsingFetch.js";
import http from "./httpUsingAxios.js";
```

## API 선택 비교

| 구분 | XMLHttpRequest | Fetch | Axios |
| --- | --- | --- | --- |
| 호환성 | 모든 브라우저 | 최신 브라우저만 | 모든 브라우저 |
| 휴대성 | 브라우저 전용 | 브라우저 전용 | Node.js 등 타 환경도 지원 |
| 발전성 | - | Request, Response 표준 정의 | - |
| 보안 | - | - | CSRF 보호 기능 내장 |
| 학습 곡선 | 높음 (콜백) | 낮음 (프로미스) | 낮음 (프로미스) |
