# 4장. 웹 구성 요소 (Web Components)

> [NOTE]      
> 내 메모/정리  
> `HTMLElement`를 상속하면 브라우저에 Custom Element를 등록할 수 있고, Component를 HTML 태그처럼 선언적으로 사용할 수 있다.  
>  
> JSX와 비슷하다고 느낄 수 있지만, 내부 동작이 다르다.   
> JSX는 React 문법(슈거) 같은거라서 React에서만 쓸 수 있고, Custom Element가 아님.   

## 📌 서론

최신 웹 개발의 패러다임은 **컴포넌트 기반 아키텍처(CBA)** 입니다. 웹 구성 요소는 프레임워크나 라이브러리에 종속되지 않고, 재사용 가능한 캡슐화된 HTML 태그를 만들 수 있는 W3C 표준 기술입니다.

주요 기술은 세 가지 API로 구성됩니다.

- **사용자 정의 요소 (Custom Elements)**: 자신만의 HTML 태그와 DOM 요소를 작성할 수 있습니다.
- **쉐도우 DOM (Shadow DOM)**: 구성 요소의 내부 로직, 스타일, 마크업을 외부의 영향으로부터 격리(캡슐화)합니다. 라이브러리나 위젯 개발에 유용합니다.
- **HTML 템플릿 (`<template>`)**: 렌더링 되지는 않지만, 동적인 콘텐츠를 생성하는 데 재사용할 수 있는 마크업 조각을 정의합니다.

---

## 1. 사용자 정의 요소 (Custom Elements)

사용자 정의 요소는 "HTML 요소를 확장하는 JavaScript 클래스"라고 생각할 수 있습니다. `HTMLElement`를 상속받아 만들며, 클래스 이름과 달리 HTML 태그로 사용할 때는 **대시(-)가 포함된 이름**을 사용해야 합니다.

### 기본 사용자 정의 요소 만들기

`HTMLElement`를 상속받아 클래스를 만들고, `connectedCallback` 라이프사이클 콜백을 사용하여 요소가 DOM에 추가될 때 코드를 실행할 수 있습니다.

`Custom Component/components/HelloWorld.js`:
```javascript
export default class HelloWorld extends HTMLElement {
  // 구성 요소가 DOM에 연결될 때 호출됩니다. (변경 등 다른 상황에 쓰는 콜백은 따로 있음)
  connectedCallback() {
    window.requestAnimationFrame(() => {
      const div = document.createElement('div');
      div.textContent = 'Hello World!';
      this.appendChild(div);
    });
  }
}
```

작성된 요소는 `customElements.define()`을 통해 브라우저의 레지스트리에 등록해야 사용할 수 있습니다.

`Custom Component/index.js`:
```javascript
import HelloWorld from './components/HelloWorld.js'

// 'hello-world'라는 이름의 태그와 HelloWorld 클래스를 연결합니다.
window.customElements.define('hello-world', HelloWorld);
```

이제 HTML에서 `<hello-world></hello-world>` 태그를 사용할 수 있습니다.

---

## 2. 속성(Attributes)과 라이프사이클

구성 요소는 외부에서 데이터를 받기 위해 속성을 사용합니다. 속성 값의 변경에 반응하여 스스로를 업데이트할 수 있어야 합니다.

### 속성 변경 감지하기

`static get observedAttributes()`에 감지할 속성 이름들을 배열로 정의하고, `attributeChangedCallback` 콜백을 구현하면 속성이 변경될 때마다 특정 로직을 실행할 수 있습니다.

`Custom Component/components/HelloWorld.js` (수정):
```javascript
const DEFAULT_COLOR = 'black';

export default class HelloWorld extends HTMLElement {
  // 1. 관찰할 속성 이름을 배열로 반환합니다.
  static get observedAttributes() {
    return ['color'];
  }

  // DOM 속성(attribute)과 JS 프로퍼티(property)를 연결하기 위해 getter/setter를 활용
  get color() {
    return this.getAttribute('color') || DEFAULT_COLOR;
  }

  set color(value) {
    this.setAttribute('color', value);
  }

  connectedCallback() {
    window.requestAnimationFrame(() => {
      this.div = document.createElement('div');
      this.div.textContent = 'Hello World!';
      this.div.style.color = this.color; // getter를 사용
      this.appendChild(this.div);
    });
  }

  // 2. observedAttributes에 지정된 속성이 변경될 때마다 호출됩니다.
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.div) {
      return;
    }

    if (name === 'color') {
      this.div.style.color = newValue;
    }
  }
}
```
이제 `<hello-world color="blue"></hello-world>` 와 같이 속성을 전달하거나, JavaScript로 `element.color = 'red'` 와 같이 프로퍼티를 변경하면 색상이 동적으로 변경됩니다.

---

## 3. 쉐도우 DOM (Shadow DOM)

쉐도우 DOM은 **캡슐화**를 위한 기술입니다. 구성 요소의 내부 DOM(Shadow Tree)은 외부 DOM과 격리되어 스타일(CSS)이나 구조가 서로에게 영향을 주지 않습니다.

- **쉐도우 DOM**: 캡슐화와 관련 (e.g. `<video>` 태그의 내부 컨트롤 버튼)
- **가상 DOM**: 성능(빠른 렌더링)과 관련

`attachShadow({mode: 'open'})`을 사용하여 쉐도우 루트를 생성하고, 내부에 DOM을 구성할 수 있습니다.

```javascript
class MyElement extends HTMLElement {
    constructor() {
      super();
      // 'open' 모드로 쉐도우 루트를 생성하고 연결합니다.
      const shadowRoot = this.attachShadow({mode: 'open'});

      // 쉐도우 DOM 내부에 스타일과 마크업을 정의합니다.
      // 이 스타일은 외부 DOM에 영향을 주지 않습니다.
      shadowRoot.innerHTML = `
        <style>
          div {
            background-color: #82b74b;
            color: white;
            padding: 10px;
          }
        </style>
        <div>yey</div>
      `;
    }
}
window.customElements.define('my-element', MyElement);
```

---

## 4. 사용자 정의 이벤트 (Custom Events)

구성 요소 내부의 상태 변화나 특정 동작을 외부로 알릴 때 사용자 정의 이벤트를 사용합니다. 이를 통해 구성 요소는 외부 환경과 느슨하게 결합(loosely coupled)될 수 있습니다.

`new CustomEvent()`로 이벤트를 생성하고, `dispatchEvent()`로 이벤트를 발생시킵니다.

### GitHub 아바타 로드 이벤트 예제

`GitAvatar2_with Event/components/GitHubAvatar.js`:
```javascript
// ...
export default class GitHubAvatar extends HTMLElement {
  // ...
  async loadNewAvatar() {
    try {
      this.url = await getGitHubAvatarUrl(this.user);
      // 성공 시 AVATAR_LOAD_COMPLETE 이벤트 발생
      const event = new CustomEvent('AVATAR_LOAD_COMPLETE', {
        detail: { avatar: this.url },
      });
      this.dispatchEvent(event);
    } catch (e) {
      // ... 에러 처리 및 에러 이벤트 발생
    }
    this.render();
  }
  // ...
}
```

페이지에서는 이벤트를 구독하여 컴포넌트의 상태 변화에 대응할 수 있습니다.

`GitAvatar2_with Event/index.js`:
```javascript
document.querySelector('github-avatar').addEventListener('AVATAR_LOAD_COMPLETE', (e) => {
  console.log('Avatar Loaded', e.detail.avatar);
});
```

---

## 5. 가상 DOM과 통합

`attributeChangedCallback` 내에서 가상 DOM의 `diff` 알고리즘을 사용하면, 변경이 필요한 부분만 효율적으로 DOM을 업데이트할 수 있습니다.

`사용자 정의 요소 + 가상DOM /components/HelloWorld.js`:
```javascript
import applyDiff from './applyDiff.js';

const createDomElement = (color) => {
  const div = document.createElement('div');
  div.textContent = 'Hello World!';
  div.style.color = color;
  return div;
};

export default class HelloWorld extends HTMLElement {
  // ...
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.hasChildNodes()) {
      return;
    }
    // applyDiff를 호출하여 변경된 부분만 렌더링합니다.
    applyDiff(this, this.firstElementChild, createDomElement(newValue));
  }

  connectedCallback() {
    window.requestAnimationFrame(() => {
      this.appendChild(createDomElement(this.color));
    });
  }
}
```

---

## 6. 실전 예제: TodoMVC 리팩토링

TodoMVC 애플리케이션 전체를 웹 구성 요소 기반으로 재작성할 수 있습니다. `<template>` 요소를 활용하여 컴포넌트의 기본 구조를 정의하고, 각 부분을 컴포넌트로 분리합니다.

- **컴포넌트**: `<todomvc-app>`, `<todomvc-list>`, `<todomvc-footer>`
- **상태 관리**: 최상위 컴포넌트인 `<todomvc-app>`이 전체 상태(todos, filter)를 관리합니다.
- **데이터 흐름**: 상태는 속성(props)을 통해 하위 컴포넌트로 전달됩니다 (`Top-Down`).
- **이벤트**: 하위 컴포넌트의 사용자 인터랙션(삭제, 완료 등)은 사용자 정의 이벤트를 통해 상위 컴포넌트로 전달됩니다 (`Bottom-Up`).

`Todomvc_with Component/index.html`:
```html
<template id="todo-app">
  <section class="todoapp">
    <!-- ... -->
    <todomvc-list></todomvc-list>
    <todomvc-footer></todomvc-footer>
  </section>
</template>

<todomvc-app></todomvc-app>
```

`Todomvc_with Component/components/Application.js`:
```javascript
export default class App extends HTMLElement {
  constructor() {
    super();
    this.state = { todos: [], filter: 'All' };
    // ...
  }

  connectedCallback() {
    // ...
    // 자식(list)이 발생시킨 DELETE_ITEM 이벤트를 부모(app)가 수신
    this.list.addEventListener('DELETE_ITEM', (e) => {
      this.deleteItem(e.detail.index);
    });
    this.syncAttributes();
  }

  deleteItem(index) {
    this.state.todos.splice(index, 1);
    this.syncAttributes(); // 상태 변경 후 하위 컴포넌트 업데이트
  }

  syncAttributes() {
    // 상태를 속성으로 하위 컴포넌트에 전달
    this.list.todos = this.state.todos;
    this.footer.todos = this.state.todos;
    this.footer.filter = this.state.filter;
  }
}
```

---

## 📌 마무리

웹 구성 요소는 특정 프레임워크에 종속되지 않는 표준 기술이므로 **이식성**과 **상호 운용성**이 높습니다. 익숙한 HTML의 연장선에서 컴포넌트를 만들 수 있다는 장점이 있으며, 많은 최신 프레임워크와 라이브러리들이 웹 구성 요소를 지원하거나 기반으로 만들어지고 있습니다.

### 참고 자료

- [사용자 정의 구성요소 - javascript.info](https://ko.javascript.info/custom-elements)
- [사용자 정의 이벤트 설명 - javascript.info](https://ko.javascript.info/dispatch-events)
- [쉐도우 DOM 설명 - TOAST UI](https://ui.toast.com/posts/ko_20170721)
- [HTML 요소 및 프로퍼티 - javascript.info](https://ko.javascript.info/dom-attributes-and-properties)
