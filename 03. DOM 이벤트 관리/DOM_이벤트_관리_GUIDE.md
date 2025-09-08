# DOM 이벤트 관리 가이드

> [NOTE]  
> **정리/내 생각**   
> 상태와 이벤트를 중앙 레지스터에서 관리하고,   
> 이벤트가 발생하면 render()를 호출해서 변경된 부분만 바꾼다.    
> 위 코드에서는 직접 render()를 호출하지만, 콜백(or 템플릿 메서드 패턴)으로 추상화가 가능해 보인다.  
> React의 useState에 대응되는 기능을 아주 간단하게 구현해본 느낌이라고 보면 될 듯. 

## YAGNI 원칙

YAGNI는 "You Ain't Gonna Need It"의 약자입니다.   
익스트림 프로그래밍(XP)의 원칙 중 하나입니다.  
실제로 필요하다고 판단될 때까지 기능을 추가하지 않는 원칙을 의미합니다.  

## DOM 이벤트 API

이벤트에 반응하려면, 이벤트가 발생하는 DOM 요소에 핸들러를 연결해야 합니다.  

### 속성에 핸들러 연결

`on`으로 시작하는 속성을 이용해 핸들러를 연결할 수 있습니다.      
이 방식은 하나의 핸들러만 연결할 수 있다는 단점이 있습니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00/index.js
let button = document.querySelector("#property");
button.onclick = () => {
  console.log("Click managed using onclick property");
};
```

### addEventListener로 핸들러 연결

하나의 이벤트에 여러 핸들러를 등록할 수 있습니다.  
`removeEventListener`로 등록된 핸들러를 제거하는 것도 가능합니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00/index.js
const button = document.querySelector('#eventListener2')
button.addEventListener('click', () => {
  console.log('First handler')
})
button.addEventListener('click', () => {
  console.log('Second handler')
})
```

### 이벤트 객체

웹에 전달된 모든 이벤트는 `Event` 인터페이스를 구현합니다.    
클릭 이벤트의 경우 `MouseEvent` 인터페이스를 추가로 구현하기도 합니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00/index.js
const button = document.querySelector('#event')
button.addEventListener('click', e => {
  console.log('event', e)
})
```

### DOM 이벤트 라이프 사이클

이벤트는 캡처, 타겟, 버블의 세 단계를 거칩니다.  
`addEventListener`의 세 번째 매개변수(`useCapture`)로 어느 단계에서 이벤트를 처리할지 결정할 수 있습니다.  
`true`는 캡처링 단계, `false`는 버블링 단계에서 이벤트를 처리하며 기본값은 `false`입니다.  

`useCapture`가 `false`(기본값)일 경우, 이벤트는 타겟 요소에서 시작하여 부모 요소로 전파(버블링)됩니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00.1/index.js
// 버튼 클릭 시, button -> div 순서로 로그가 출력됩니다.
const button = document.querySelector('button')
const div = document.querySelector('div')

div.addEventListener('click', () => {
  console.log('Div Clicked')
}, false)

button.addEventListener('click', e => {
  console.log('Button Clicked')
}, false)
```

`Event` 인터페이스의 `stopPropagation` 메서드를 사용하면 이벤트 전파를 중단시킬 수 있습니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00.2/index.js
const button = document.querySelector('button')
const div = document.querySelector('div')

div.addEventListener('click', () => {
  console.log('Div Clicked')
}, false)

button.addEventListener('click', e => {
  // stopPropagation()을 통해 부모 요소인 div로 이벤트가 전파(버블링)되는 것을 막습니다.
  e.stopPropagation()
  console.log('Button Clicked')
}, false)
```

`useCapture`가 `true`일 경우, 이벤트는 최상위 요소에서 시작하여 타겟 요소까지 내려가는 동안(캡처링) 처리됩니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00.3/index.js
// 버튼 클릭 시, div -> button 순서로 로그가 출력됩니다.
const button = document.querySelector('button')
const div = document.querySelector('div')

div.addEventListener('click', e => {
  console.log('Div Clicked')
}, true)

button.addEventListener('click', e => {
  console.log('Button Clicked')
}, true)
```

### 사용자 정의 이벤트 사용

`CustomEvent`를 사용하여 이벤트를 직접 만들고 `dispatchEvent`로 실행할 수 있습니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/00.4/index.js
const EVENT_NAME = 'FiveCharInputValue'
const input = document.querySelector('input')

input.addEventListener('input', () => {
  const { length } = input.value
  if (length === 5) {
    const event = new CustomEvent(EVENT_NAME, {
      detail: {
        time: (new Date()).getTime()
      }
    })
    // input 요소에서 직접 이벤트를 발생시킵니다.
    input.dispatchEvent(event)
  }
})

// dispatchEvent로 발생시킨 커스텀 이벤트를 리스닝합니다.
input.addEventListener(EVENT_NAME, e => {
  console.log('handling custom event...', e.detail)
})
```

## TodoMVC에 이벤트 추가

### 템플릿 요소

복잡한 DOM 요소를 `document.createElement` API 대신 HTML의 `<template>` 태그로 정의할 수 있습니다.  
`<template>` 태그 안의 내용은 스크립트로 DOM에 추가하기 전까지 렌더링되지 않습니다.  

```html
<!-- 03. DOM 이벤트 관리/Chapter03/01.1/index.html -->
<template id="todo-app">
  <section class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <input class="new-todo" placeholder="What needs to be done?" autofocus />
    </header>
    <section class="main">
      <input id="toggle-all" class="toggle-all" type="checkbox" />
      <label for="toggle-all"> Mark all as complete </label>
      <ul class="todo-list" data-component="todos"></ul>
    </section>
    <footer class="footer">
      <span class="todo-count" data-component="counter"> </span>
      <ul class="filters" data-component="filters">
        <li>
          <a href="#/">All</a>
        </li>
        <li>
          <a href="#/active">Active</a>
        </li>
        <li>
          <a href="#/completed">Completed</a>
        </li>
      </ul>
      <button class="clear-completed">Clear completed</button>
    </footer>
  </section>
</template>
```

정의된 템플릿은 아래와 같이 스크립트에서 복제하여 사용합니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/01.1/view/app.js
let template;

const createAppElement = () => {
  if (!template) {
    template = document.getElementById("todo-app");
  }
  return template.content.firstElementChild.cloneNode(true);
};

export default (targetElement) => {
  const newApp = targetElement.cloneNode(true);
  newApp.innerHTML = "";
  newApp.appendChild(createAppElement());
  return newApp;
};
```

> [NOTE]  
> 이 추가된 app.js는 구성요소 UI를 생성하는 역할을 한다.   
> `index.js`는 `app.js`로 인해서 항상 `#root`만 가져와서 처리할 수 있게 추상화되었다.  
> ```javascript
> const render = () => {
>   window.requestAnimationFrame(() => {
>       // 이전의 index.js는 구현에 의존하여 .todo-app을 가져와야 했음.
>       const main = document.querySelector('#root');  
>       ...
>   })
> }
> ```

### 기본 이벤트 처리 아키텍처

이벤트 발생 시 상태를 변경하고, 변경된 상태에 따라 다시 렌더링하는 루프를 구성할 수 있습니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/01.2/index.js
const state = {
  todos: [],
  currentFilter: 'All'
}

const events = {
  // 이벤트가 발생하면 상태를 변경하고 render()를 호출합니다.
  deleteItem: (index) => {
    state.todos.splice(index, 1);
    render();
  },
  addItem: (text) => {
    state.todos.push({ text, completed: false });
    render();
  },
};

const render = () => {
  window.requestAnimationFrame(() => {
    const main = document.querySelector("#root");
    // 렌더링 시 events 객체를 view에 전달합니다.
    const newMain = registry.renderRoot(main, state, events);
    applyDiff(document.body, main, newMain);
  });
};
```

애플리케이션이 복잡해지면 이벤트 레지스트리를 만들어 이벤트를 중앙에서 관리하는 것이 좋습니다.  

> [NOTE]    
> 각 component에서 `events`를 받고, 적절한 이벤트를 호출함.  

## 이벤트 위임

각각의 자식 요소에 이벤트 핸들러를 등록하는 대신, 부모 요소에 하나의 핸들러를 등록하여 이벤트를 관리할 수 있습니다.  
이를 이벤트 위임이라고 합니다.  
이벤트 위임을 사용하면 동적으로 추가되는 자식 요소들의 이벤트도 처리할 수 있으며, 메모리 사용량을 줄일 수 있습니다.  

```javascript
// 03. DOM 이벤트 관리/Chapter03/01.4/view/todos.js
export default (targetElement, state, events) => {
  const { todos } = state
  const { deleteItem } = events
  const newTodoList = targetElement.cloneNode(true)

  newTodoList.innerHTML = ''

  todos
    .map((todo, index) => getTodoElement(todo, index))
    .forEach(element => {
      newTodoList.appendChild(element)
    })

  // 부모 요소인 ul(newTodoList)에 하나의 이벤트 리스너를 추가합니다.
  newTodoList.addEventListener('click', e => {
    // e.target.matches로 이벤트가 발생한 요소를 확인합니다.
    // button tag고 class가 destroy인가?
    if (e.target.matches('button.destroy')) {
      // data-index 속성을 이용해 어떤 아이템에서 이벤트가 발생했는지 식별합니다.
      deleteItem(e.target.dataset.index)
    }
  })

  return newTodoList
}
```

> [NOTE]  
> 결론: DOM 이벤트 관리 기법을 소개하고,   
> 최종적으론 중앙화된 이벤트 처리와 위임 패턴으로 성능과 유지보수성을 개선했다.  
