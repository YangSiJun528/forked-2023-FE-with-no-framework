# 상태 관리 가이드

## 상태 관리 소개

상태 관리는 프론트엔드 애플리케이션의 데이터를 효과적으로 관리하는 방법을 의미합니다.  
애플리케이션의 규모와 복잡도에 맞는 적절한 상태 관리 아키텍처를 선택하는 것은 매우 중요합니다.  
이 가이드에서는 MVC, 옵저버, 이벤트 버스 등 다양한 상태 관리 패턴을 단계별로 구현합니다.

> [NOTE]   
> 여기서 다루는 패턴(MVC, 옵저버, 이벤트 버스, Redux 등)은 모두 상태를 전역적으로 관리하고 접근하는 방법에 해당한다.   
> 따라서 비교 대상은 외부 라이브러리나 SPA 프레임워크(React, Vue, Svelte, Solid 등) 가 제공하는 전역 상태 관리 기능이어야 한다.   
> 단순히 props 전달(로컬 상태 공유) 과 비교하는 것은 범위가 다르므로 적절하지 않다. (이것들과 관련된 설명을 맨 아래 추가함.)

## 1. MVC (Model-View-Controller) 패턴

MVC는 애플리케이션의 구성 요소를 모델, 뷰, 컨트롤러 세 가지 역할로 구분하는 패턴입니다.  
상태(데이터)와 비즈니스 로직은 모델에, UI는 뷰에, 그리고 둘을 연결하는 역할은 컨트롤러가 담당합니다.

`01. todo-mvc-pattern/model/model.js`:
```javascript
const cloneDeep = (x) => {
    return JSON.parse(JSON.stringify(x));
};

const INITAL_STATE = {
    todos: [],
    currentFilter: 'All',
};

export default (initialState = INITAL_STATE) => {
    const state = cloneDeep(initialState);

    const getState = () => {
        return Object.freeze(cloneDeep(state));
    };

    const addItem = (text) => {
        if (!text) return;
        state.todos.push({
            text,
            completed: false,
        });
    };

    // ... updateItem, deleteItem 등 다른 메서드 ...

    return {
        addItem,
        // ...
        getState,
    };
};
```
> [NOTE]
> - `Object.freeze()`를 사용해서 model 외부에서 상태 변경을 불가능하게 만들어 반환한다.
> - 이러면 로직 분리가 명확하고, 유지보수하거나 테스트하기 쉬워진다.

컨트롤러는 사용자의 입력을 받아 모델의 상태를 변경하고, 변경된 상태를 다시 뷰에 전달하여 화면을 새로 그립니다.  
이 구조에서는 상태 변경 후 `render` 함수를 수동으로 호출해야 합니다.

`01. todo-mvc-pattern/index.js`:
```javascript
// ...
const model = modelFactory();

const events = {
    addItem: (text) => {
        model.addItem(text);
        render(model.getState()); // 모델 변경 후 수동으로 render 호출
    },
    // ... 다른 이벤트 핸들러 ...
};

const render = (state) => {
    // ... 렌더링 로직 ...
};

render(model.getState());
```

> [NOTE]
> - 모델 → model.js 내부 (상태 + 비즈니스 로직)
> - 컨트롤러 → index.js 의 events 객체 (사용자 입력 → 모델 변경 → 뷰 갱신)
> - 뷰 → render 함수 (상태 → 화면)

## 2. 반응형: 옵저버 패턴

MVC 패턴에서 `render`를 수동으로 호출하는 문제를 해결하기 위해 옵저버 패턴을 도입할 수 있습니다.  
모델이 변경되면, 등록된 리스너(옵저버)들에게 자동으로 변경 사실을 알려주는 방식입니다.

### 2-1. 옵저버블 모델

모델에 `addChangeListener` 메서드를 추가하여, 상태 변경을 감지할 리스너(콜백 함수)를 등록합니다.  
상태가 변경되는 메서드(`addItem` 등)가 호출될 때마다 `invokeListeners`를 통해 모든 리스너를 실행합니다.

`02. todo-observer-pattern/model/model.js`:
```javascript
// ...
export default (initialState = INITAL_STATE) => {
    const state = cloneDeep(initialState);
    let listeners = [];

    const addChangeListener = (listener) => {
        listeners.push(listener);
        listener(freeze(state)); // 등록 시 즉시 한 번 호출
        // ...
    };

    const invokeListeners = () => {
        const data = freeze(state);
        listeners.forEach((l) => l(data));
    };

    const addItem = (text) => {
        // ... 상태 변경 로직 ...
        invokeListeners(); // 리스너 호출
    };

    return {
        addItem,
        // ...
        addChangeListener,
    };
};
```

컨트롤러는 `render` 함수를 리스너로 한 번만 등록하면 됩니다.

`02. todo-observer-pattern/index.js`:
```javascript
// ...
const model = modelFactory();
const { addChangeListener, ...events } = model;

// ... render 함수 정의 ...

addChangeListener(render); // render 함수를 리스너로 등록
```

> [NOTE]   
> `addChangeListener()`로 추가되는 listener 들은 상태 변경 작업 시 호출되는 콜백 작업들이다.  
> 이 예시에서는 상태 변경이 발생할 때마다 render를 수행하는 listener를 등록한다.    
> 추가로 로깅이나 여러 작업을 수행하는 listener를 등록할 수도 있다.

### 2-2. 옵저버블 팩토리

옵저버 로직을 재사용할 수 있도록 별도의 팩토리 함수로 분리할 수 있습니다.  
이 팩토리는 원본 모델의 메서드를 감싸(wrapping) 리스너 호출 로직을 자동으로 추가해주는 프록시 모델을 생성합니다.

`04. todo-observable-factory/model/observable.js`:
```javascript
export default (model, stateGetter) => {
  let listeners = [];

  const addChangeListener = (cb) => { /* ... */ };
  const invokeListeners = () => { /* ... */ };

  const wrapAction = (originalAction) => {
    return (...args) => {
      const value = originalAction(...args);
      invokeListeners();
      return value;
    };
  };

  // ...
  return Object.keys(model).reduce((proxy, key) => {
    // ...
    return { ...proxy, [key]: wrapAction(action) };
  }, baseProxy);
};
```

> [NOTE]   
> `Object.keys(model)`로 model의 각 keys(메서드)를 찾아서 `wrapAction(action)`을 실행하는 proxy 객체를 반환함.

### 2-3. 네이티브 프록시(Proxy) 활용

ES6의 `Proxy` 객체를 사용하면 옵저버블 팩토리를 더 간결하게 만들 수 있습니다.  
`set` 트랩을 사용하여 객체의 속성에 값이 할당될 때마다 리스너를 자동으로 호출합니다.

`05. todo-observable-factory-proxy/model/observable.js`:
```javascript
export default (initalState) => {
  let listeners = [];

  // Proxy(target, handler)
  const proxy = new Proxy(cloneDeep(initalState), {
    set: (target, name, value) => {
      target[name] = value;
      listeners.forEach((l) => l(freeze(proxy)));
      return true;
    },
  });

  proxy.addChangeListener = (cb) => { /* ... */ };

  return proxy;
};
```

> [NOTE]   
> ES6 Proxy 설명하는 자료
> - https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Proxy
> - https://ko.javascript.info/proxy

## 3. 이벤트 버스 패턴

이벤트 버스는 애플리케이션의 모든 상태 변경을 "이벤트"라는 단일 객체를 통해 처리하는 패턴입니다.  
뷰는 더 이상 모델의 특정 메서드를 호출하지 않고, 정해진 형식의 이벤트 객체를 생성하여 버스에 전달(`dispatch`)합니다.

> [NOTE]    
> 옵저버블, Proxy, 이벤트 버스 패턴 모두 MVC의 응용 패턴으로 볼 수 있다.
> - 옵저버블/Proxy: 컨트롤러 역할을 일부 자동화하여 숨기는 형태
> - 이벤트 버스: 컨트롤러가 거의 완전히 숨겨진 형태    
> 공통점: 상태 변경과 뷰 갱신을 단방향 데이터 흐름으로 관리 가능 (View → Event(Action) → Store(Model/Reducer) → View)

### 3-1. 직접 구현한 이벤트 버스

모델은 이전 상태와 이벤트 객체를 받아 새로운 상태를 반환하는 순수 함수(리듀서) 형태로 작성됩니다.

`06. todo-eventbus-no-framework/model/model.js`:
```javascript
// ...
const methods = {
  ITEM_ADDED: addItem,
  // ...
};

export default (initialState = INITAL_STATE) => {
  return (prevState, event) => {
    if (!prevState) {
      return cloneDeep(initialState);
    }

    const currentModifier = methods[event.type];

    if (!currentModifier) {
      return prevState;
    }
    return currentModifier(prevState, event);
  };
};
```

뷰는 `dispatch` 함수를 통해 이벤트 객체를 전달합니다.

`06. todo-eventbus-no-framework/view/app.js`:
```javascript
// ...
const addEvents = (targetElement, dispatch) => {
  targetElement.querySelector('.new-todo').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const event = eventCreators.addItem(e.target.value);
      dispatch(event);
      e.target.value = '';
    }
  });
  // ...
};
```

> [NOTE]   
> `./06. todo-eventbus-no-framework`에 주석으로 동작을 간단하게 설명함.  
> 함수형 패러다임을 사용하여 순수 함수를 반환하는 식으로 구현되어, 함수형에 익숙하지 않으면 한눈에 들어오지 않을 수 있음.
> 함수형 프로그래밍을 의식하면서 보면 이해하기 쉬워짐.
>
> 08 예시에서 Redux를 사용하는데 기존 코드와 호환됨.   
> 덕 타이핑(Duck Typing) 덕분에 직접 만든 eventBus와 Redux의 store가 동일한 인터페이스를 만족하는 함수로 인식됨.  
> 이는 프레임워크 없는 개발이지만, Redux의 구현과 일치하게 역으로 만들어낸 것으로 보임.

#### 구조 핵심 정리

1. **Event Bus (`model/eventBus.js`)**
    * 중앙 허브 역할: 모든 상태 변경 중개
    * `dispatch(event)`: 상태 변경 요청 이벤트 수신
    * `subscribe(listener)`: 상태 변경 시 실행될 콜백 등록
    * `getState()`: 현재 상태 반환 (불변 객체)
2. **Model (`model/model.js`)**
    * 비즈니스 로직 담당: 이벤트별 상태 변경 결정
    * `(prevState, event) => newState` 형태의 순수 함수 (= 리듀서)
    * 이벤트 타입에 맞는 함수 실행 → 새 상태 반환
    * 상태가 이전과 동일하면 구독자 호출 생략 → 불필요한 렌더링 방지
3. **Event Creators (`model/eventCreators.js`)**
    * 이벤트 객체 생성 헬퍼 함수 모음
    * `{ type: 'EVENT_TYPE', payload: data }` 형식의 이벤트 반환
    * View에서 이벤트 구조를 신경 쓰지 않고 간편하게 호출 가능
4. **Views (`view/*.js`)**
    * UI 렌더링 및 사용자 입력 수집
    * 이벤트 발생 시 eventCreators로 이벤트 생성 → `dispatch` 호출
    * 상태를 직접 수정하지 않고, 이벤트를 통해 상태 변경 요청
5. **Controller (`index.js`)**
    * 앱 초기화 및 구성 요소 연결
    * 모델과 이벤트 버스 생성
    * 상태 변경 시 `render` 구독
    * `render` + `applyDiff`를 통해 변경된 부분만 DOM 업데이트

#### 데이터 흐름 예시: Todo 아이템 삭제

1. **사용자 액션**: 삭제 버튼 클릭
2. **이벤트 생성 & 전달(View → Event Bus)**:
    * `eventCreators.deleteItem(index)` → 이벤트 객체 생성
    * `dispatch(event)` 호출
3. **이벤트 버스 처리**:
    * `dispatch` → `model(state, event)` 호출 → 새 상태 요청
4. **상태 변경**:
    * `deleteItem` 실행 → 해당 아이템 제거된 `newState` 반환
5. **상태 업데이트 & 전파**:
    * 이벤트 버스가 내부 state 교체
    * 구독자(render) 호출 → 새 상태 전달
6. **UI 렌더링**:
    * `render` 함수가 새 상태 기반으로 UI 업데이트
    * `applyDiff`로 변경된 DOM만 반영

### 3-2. Redux 라이브러리 사용

이벤트 버스 패턴은 Redux의 핵심 원리와 매우 유사합니다.  
Redux는 스토어(Store), 액션(Action), 리듀서(Reducer)라는 용어를 사용합니다.

- 스토어: 이벤트 버스에 해당하며, 상태 저장 및 디스패치, 구독 기능을 제공합니다.
- 액션: 이벤트 객체에 해당합니다.
- 리듀서: 모델 함수에 해당하며, 이전 상태와 액션을 받아 다음 상태를 반환합니다.

`08. todo-eventbus-redux/index.js`:
```javascript
import reducer from './model/reducer.js';
// ...

const store = Redux.createStore(reducer, INITAL_STATE);

const render = () => {
  window.requestAnimationFrame(() => {
    const main = document.querySelector('#root');
    const newMain = registry.renderRoot(main, store.getState(), store.dispatch);
    applyDiff(document.body, main, newMain);
  });
};

store.subscribe(render);

render();
```

## 상태 관리 전략 비교

| 구분 | MVC | 반응형(옵저버) | 이벤트 버스 |
| --- | --- | --- | --- |
| 장점 | 간단한 구현, 높은 테스트 가능성 | 일관성 있는 객체 모델 | 엄격한 규칙, 높은 확장성 |
| 단점 | 모호한 역할 정의, 확장성 문제 | 추상화의 복잡성 | 많은 보일러플레이트 코드 |

## 추가: 다른 프레임워크의 상태관리 기능들

### SPA 프레임워크의 기본 상태 관리 원리

거의 모든 SPA 프레임워크는 컴포넌트의 로컬 상태(props, state)를 기본으로 제공한다

- 모든 상태는 읽기 전용이며, 전용 변경 함수를 통해서만 수정 가능 
  - props로 자식에게 필요한 상태만 전달해줄 수 있음.
- 변경 함수 호출 시에만 상태 변경과 DOM 업데이트가 발생
- 읽기 전용/로컬 상태가 필요한 이유: 컴포넌트의 재사용성(함수형 프로그래밍 패러다임), 캡슐화, 명확한 데이터 흐름

### 일반적인 SPA의 로컬 상태 변경 흐름

```
부모 state → props 전달 → 자식 컴포넌트
자식 이벤트 → callback 실행 → 부모 state 변경 → props로 다시 전달
```

### 프레임워크별 전역 상태 관리 지원

#### React, Vue
- **기본 제공**: 로컬 상태만 내장, 전역 상태는 Context API 수준까지만 지원
- **외부 의존성**: 복잡한 전역 상태 관리를 위해 외부 라이브러리 필수 (Redux, Zustand, Pinia 등)
- **성능 이슈**: 전역 상태 변경 후 Virtual DOM diff를 통해 전체 컴포넌트 트리를 비교하여 변경 사항 반영

#### Svelte, Solid
- **기본 제공**: 로컬 상태 + 전역 Store 기능까지 프레임워크에 내장
- **외부 의존성**: 외부 상태 관리 라이브러리 거의 불필요
- **구현 방식**: Store(Svelte) / 전역 Signal(Solid) 사용
- **성능 우위**: 반응형 시스템으로 인해 상태 변경 시 필요한 DOM 요소만 직접 업데이트

### 반응형 시스템의 전역 상태 관리

#### React, Vue의 전역 상태 관리 문제점
- 전역 상태 변경 시 root부터 시작하는 diff 비교 과정 필요
- 변경된 부분을 찾기 위해 전체 컴포넌트 트리를 순회
- 성능 오버헤드 발생

#### Svelte, Solid의 전역 상태 관리 장점
- **직접적인 DOM 조작**: 반응형 시스템으로 인해 상태 변경 시 해당 DOM 요소만 직접 업데이트
- **위치 무관성**: 어느 컴포넌트에서 전역 상태를 변경하든 관련된 DOM만 효율적으로 업데이트
- **양방향 데이터 흐름 지원**:
    - Store/전역 Signal을 통해 자식에서 부모 상태 변경 가능 (둘 다 공식적으로 추천하지 않는 방식임)
    - Svelte는 `bind` 디렉티브로 로컬 변수에서도 양방향 바인딩 지원
    - 하지만 복잡성을 증가시키므로 실제 개발에서는 단방향 흐름 권장 (+ 불필요한 전역 상태 증가) 

### 로컬/전역 상태 관리 가이드라인

1. 시작은 항상 로컬 상태로 - 의심스러우면 로컬에서 시작해서 필요에 따라 전역으로 올려가는 것이 안전합니다.
2. Prop Drilling 3단계 법칙 - 데이터를 3단계 이상 깊게 전달해야 한다면 전역 상태 고려
3. 비즈니스 로직 vs UI 로직 구분:
   - 비즈니스 데이터 (사용자 정보, 장바구니) → 전역
   - UI 상태 (모달 열림, 드롭다운) → 로컬
4. 생명주기 고려: 컴포넌트가 사라져도 데이터가 유지되어야 하면 전역, 아니면 로컬
