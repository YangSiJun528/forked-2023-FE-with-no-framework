# 웹 구성 요소 가이드

## 웹 구성 요소 소개

웹 구성 요소는 브라우저에 내장된 API를 사용하여 재사용 가능한 사용자 정의 HTML 태그를 만드는 기술입니다.  
주요 API는 다음과 같습니다.  

- Custom Elements: 개발자가 자신만의 DOM 요소를 정의할 수 있게 합니다.  
- Shadow DOM: 요소의 내부 스타일과 마크업을 외부로부터 캡슐화합니다.  
- HTML Templates: 렌더링되지 않고 스크립트에서 동적 콘텐츠를 생성하기 위해 사용하는 `<template>` 태그입니다.  

## 1단계: 기본 사용자 정의 요소

`HTMLElement`를 상속받아 간단한 사용자 정의 요소를 만들 수 있습니다.  

`Custom Component/components/HelloWorld.js`:
```javascript
export default class HelloWorld extends HTMLElement {
  // 구성 요소가 DOM에 연결될 때 호출됩니다.
  connectedCallback() {
    window.requestAnimationFrame(() => {
      const div = document.createElement('div');
      div.textContent = 'Hello World!';
      this.appendChild(div);
    });
  }
}
```

작성된 요소는 `customElements.define`을 통해 브라우저에 등록해야 사용할 수 있습니다.  

`Custom Component/index.js`:
```javascript
import HelloWorld from './components/HelloWorld.js'

// 'hello-world'라는 이름의 태그와 HelloWorld 클래스를 연결합니다.
window
  .customElements
  .define('hello-world', HelloWorld)
```

`Custom Component/index.html`:
```html
<hello-world></hello-world>
```

## 2단계: 속성과 라이프사이클 콜백

사용자 정의 요소는 속성(attribute)을 가질 수 있으며, 속성 변경에 따라 반응할 수 있습니다.  

`Custom Component/components/HelloWorld.js` (수정):
```javascript
const DEFAULT_COLOR = 'black';

export default class HelloWorld extends HTMLElement {
  // 관찰할 속성 이름을 배열로 반환합니다.
  static get observedAttributes() {
    return ['color'];
  }

  // observedAttributes에 지정된 속성이 변경될 때마다 호출됩니다.
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.div) {
      return;
    }

    if (name === 'color') {
      this.div.style.color = newValue;
    }
  }

  // getter와 setter를 사용해 프로퍼티처럼 속성을 다룰 수 있습니다.
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
      this.div.style.color = this.color;
      this.appendChild(this.div);
    });
  }
}
```

## 3단계: 비동기 작업을 포함한 컴포넌트

`GitHubAvatar` 컴포넌트는 `user` 속성을 받아 GitHub API를 호출하고, 해당 유저의 아바타 이미지를 보여줍니다.  

`GitAvatar1/components/GitHubAvatar.js`:
```javascript
const getGitHubAvatarUrl = async (user) => {
  // ... fetch를 사용하여 GitHub API 호출 ...
};

export default class GitHubAvatar extends HTMLElement {
  // ... constructor, getter, setter ...

  render() {
    window.requestAnimationFrame(() => {
      this.innerHTML = '';
      const img = document.createElement('img');
      img.src = this.url;
      this.appendChild(img);
    });
  }

  async loadNewAvatar() {
    try {
      this.url = await getGitHubAvatarUrl(this.user);
    } catch (e) {
      this.url = ERROR_IMAGE;
    }
    this.render();
  }

  connectedCallback() {
    this.render(); // 초기에 로딩 이미지 렌더링
    this.loadNewAvatar(); // 비동기적으로 아바타 로드
  }
}
```

## 4단계: 사용자 정의 이벤트를 통한 통신

컴포넌트는 내부의 상태 변화를 외부로 알리기 위해 사용자 정의 이벤트를 발생시킬 수 있습니다.  

`GitAvatar2_with Event/components/GitHubAvatar.js` (수정):
```javascript
// ...
export default class GitHubAvatar extends HTMLElement {
  // ...

  // 아바타 로딩 성공 시 호출
  onLoadAvatarComplete() {
    const event = new CustomEvent(AVATAR_LOAD_COMPLETE, {
      detail: {
        avatar: this.url,
      },
    });
    this.dispatchEvent(event);
  }

  // 아바타 로딩 실패 시 호출
  onLoadAvatarError(error) {
    const event = new CustomEvent(AVATAR_LOAD_ERROR, {
      detail: {
        error,
      },
    });
    this.dispatchEvent(event);
  }

  async loadNewAvatar() {
    // ...
    try {
      this.url = await getGitHubAvatarUrl(this.user);
      this.onLoadAvatarComplete(); // 성공 이벤트 발생
    } catch (e) {
      this.url = ERROR_IMAGE;
      this.onLoadAvatarError(e); // 에러 이벤트 발생
    }
    this.render();
  }
  // ...
}
```

페이지에서는 이벤트를 구독하여 컴포넌트의 상태 변화에 대응할 수 있습니다.  

`GitAvatar2_with Event/index.js`:
```javascript
document.querySelectorAll('github-avatar').forEach((avatar) => {
  avatar.addEventListener(EVENTS.AVATAR_LOAD_COMPLETE, (e) => {
    console.log('Avatar Loaded', e.detail.avatar);
  });

  avatar.addEventListener(EVENTS.AVATAR_LOAD_ERROR, (e) => {
    console.log('Avatar Loading error', e.detail.error);
  });
});
```

## 5단계: 가상 DOM과 통합

`attributeChangedCallback` 내에서 가상 DOM diff 알고리즘을 사용하여 효율적으로 DOM을 업데이트할 수 있습니다.  

`사용자 정의 요소 + 가상DOM /components/HelloWorld.js`:
```javascript
import applyDiff from './applyDiff.js';

// ...
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

## 6단계: TodoMVC 애플리케이션 리팩토링

TodoMVC 애플리케이션 전체를 웹 구성 요소 기반으로 재작성합니다.  
`<todomvc-app>`, `<todomvc-list>`, `<todomvc-footer>` 세 가지 컴포넌트를 사용합니다.  

`Todomvc_with Component/index.html`:
```html
<!-- ... -->
<template id="footer"> ... </footer></template>
<template id="todo-item"> ... </li></template>
<template id="todo-app">
  <section class="todoapp">
    <!-- ... -->
    <todomvc-list></todomvc-list>
    <todomvc-footer></todomvc-footer>
  </section>
</template>

<todomvc-app></todomvc-app>
<!-- ... -->
```

최상위 컴포넌트인 `<todomvc-app>`이 상태를 관리하고, 하위 컴포넌트와 속성을 통해 상태를 동기화하며 이벤트를 통해 하위의 변경 사항을 수신합니다.  

`Todomvc_with Component/components/Application.js`:
```javascript
export default class App extends HTMLElement {
  constructor() {
    super();
    this.state = {
      todos: [],
      filter: 'All',
    };
    // ...
  }

  deleteItem(index) {
    this.state.todos.splice(index, 1);
    this.syncAttributes();
  }

  addItem(text) {
    this.state.todos.push({ text, completed: false });
    this.syncAttributes();
  }

  syncAttributes() {
    this.list.todos = this.state.todos;
    this.footer.todos = this.state.todos;
    this.footer.filter = this.state.filter;
  }

  connectedCallback() {
    // ...
    this.list.addEventListener(EVENTS.DELETE_ITEM, (e) => {
      this.deleteItem(e.detail.index);
    });

    this.syncAttributes();
  }
}
```
