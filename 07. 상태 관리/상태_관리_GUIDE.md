# 상태 관리 가이드

## 상태 관리 소개

상태 관리는 프론트엔드 애플리케이션의 데이터를 효과적으로 관리하는 방법을 의미합니다.  
애플리케이션의 규모와 복잡도에 맞는 적절한 상태 관리 아키텍처를 선택하는 것은 매우 중요합니다.  
이 가이드에서는 MVC, 옵저버, 이벤트 버스 등 다양한 상태 관리 패턴을 단계별로 구현합니다.  

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

### 2-3. 네이티브 프록시(Proxy) 활용

ES6의 `Proxy` 객체를 사용하면 옵저버블 팩토리를 더 간결하게 만들 수 있습니다.  
`set` 트랩을 사용하여 객체의 속성에 값이 할당될 때마다 리스너를 자동으로 호출합니다.  

`05. todo-observable-factory-proxy/model/observable.js`:
```javascript
export default (initalState) => {
  let listeners = [];

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

## 3. 이벤트 버스 패턴

이벤트 버스는 애플리케이션의 모든 상태 변경을 "이벤트"라는 단일 객체를 통해 처리하는 패턴입니다.  
뷰는 더 이상 모델의 특정 메서드를 호출하지 않고, 정해진 형식의 이벤트 객체를 생성하여 버스에 전달(`dispatch`)합니다.  

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
