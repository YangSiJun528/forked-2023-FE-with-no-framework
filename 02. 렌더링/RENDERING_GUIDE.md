# 렌더링 단계별 가이드

이 문서는 프레임워크 없이 TodoMVC 애플리케이션의 렌더링 엔진을 구현하는 과정을 단계별로 안내합니다.  

## 1단계: 기본 DOM 조작

렌더링의 가장 기본적인 형태는 DOM을 직접 조작하는 것입니다.  

`index.html`:
```html
<section class="todoapp">
    <header class="header">
        <h1>todos</h1>
        <input class="new-todo" placeholder="What needs to be done?" autofocus>
    </header>
    <section class="main">
        <input id="toggle-all" class="toggle-all" type="checkbox">
        <label for="toggle-all">Mark all as complete</label>
        <ul class="todo-list">
        </ul>
    </section>
    <footer class="footer">
        <span class="todo-count">1 Item Left</span>
        <ul class="filters">
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
```

`index.js`:
```javascript
import getTodos from './getTodos.js'
import view from './view.js'

const state = {
  todos: getTodos(),
  currentFilter: 'All'
}

const main = document.querySelector('.todoapp')

window.requestAnimationFrame(() => {
  const newMain = view(main, state)
  main.replaceWith(newMain)
})
```

설명: `index.js`는 `state` 객체를 정의하고 `view` 함수를 호출하여 새 DOM 요소를 생성합니다.  
`replaceWith`를 사용해 기존 요소를 새 요소로 교체합니다.  
`requestAnimationFrame`은 브라우저의 다음 리페인트 직전에 렌더링이 일어나도록 보장합니다.

> [NOTE]  
> [`window.requestAnimationFrame()`](https://developer.mozilla.org/ko/docs/Web/API/Window/requestAnimationFrame)는 Web API 함수, 다름 프레임 생성 시점 맞춰서 콜백 호출 

## 2단계: 코드 리팩토링

단일 `view.js` 파일에 있던 렌더링 로직을 여러 구성 요소 파일로 분리하여 가독성과 유지 관리성을 향상시킵니다.  

`index.js` (변경):
```javascript
import getTodos from './getTodos.js'
import appView from './view/app.js' // 'view.js'에서 'view/app.js'로 변경

const state = {
  todos: getTodos(),
  currentFilter: 'All'
}

const main = document.querySelector('.todoapp')

window.requestAnimationFrame(() => {
  const newMain = appView(main, state) // 'view'에서 'appView'로 변경
  main.replaceWith(newMain)
})
```

설명: `view.js`가 `app.js`, `todos.js`, `counter.js`, `filters.js` 등으로 분할됩니다.  
`index.js`는 `app.js`를 기본 진입점으로 사용합니다.  
이 리팩토링으로 각 구성 요소가 자체 렌더링을 담당하게 되어 코드 구성이 개선됩니다.  

## 3단계: 구성 요소 레지스트리 도입

수동으로 컴포넌트를 호출하는 대신, 컴포넌트 레지스트리를 도입하여 렌더링을 자동화합니다.  

`index.html` (변경):
```html
<ul class="todo-list" data-component="todos">
</ul>
...
<span class="todo-count" data-component="counter">
    1 Item Left
</span>
...
<ul class="filters" data-component="filters">
...
</ul>
```

`registry.js` (새 파일):
```javascript
const registry = {}

const renderWrapper = component => {
  return (targetElement, state) => {
    const element = component(targetElement, state)

    const childComponents = element
      .querySelectorAll('[data-component]')

    Array
      .from(childComponents)
      .forEach(target => {
        const name = target
          .dataset
          .component

        const child = registry[name]
        if (!child) {
          return
        }

        target.replaceWith(child(target, state))
      })

    return element
  }
}

const add = (name, component) => {
  registry[name] = renderWrapper(component)
}

const renderRoot = (root, state) => {
  const cloneComponent = root => {
    return root.cloneNode(true)
  }

  return renderWrapper(cloneComponent)(root, state)
}

export default {
  add,
  renderRoot
}
```

`index.js` (변경):
```javascript
import getTodos from './getTodos.js'
import todosView from './view/todos.js'
import counterView from './view/counter.js'
import filtersView from './view/filters.js'

import registry from './registry.js'

registry.add('todos', todosView)
registry.add('counter', counterView)
registry.add('filters', filtersView)

const state = {
  todos: getTodos(),
  currentFilter: 'All'
}

window.requestAnimationFrame(() => {
  const main = document.querySelector('.todoapp')
  const newMain = registry.renderRoot(main, state)
  main.replaceWith(newMain)
})
```

설명:
- `data-component` 속성이 HTML에 추가되어 어떤 컴포넌트가 어떤 DOM 요소를 렌더링할지 선언적으로 지정합니다.  
- `registry.js`는 `add`와 `renderRoot` 함수를 제공합니다.  
`add`는 컴포넌트를 레지스트리에 등록하고, `renderRoot`는 루트 요소부터 전체 애플리케이션을 렌더링합니다.  
- `renderWrapper`는 컴포넌트를 감싸고 `data-component` 속성을 가진 자식 요소를 찾아 재귀적으로 렌더링합니다.  

> [NOTE]  
> `renderWrapper` 부가 설명
> 함수를 반환하는 것. 실행하면 렌더링을 하는 함수를 반환함.
> JS 문법을 잘 몰라서 설명 추가함.
> ```js
> // 고차 함수(Higher-Order Function) 예시
> // 'greetingFunction'을 받아서, 나중에 이름을 넣으면 문자열을 반환하는 함수를 돌려줌
> const createGreeter = greetingFunction => {
>   // 반환되는 함수: 실제 인사 문자열을 만들어 반환
>   return name => {
>       return greetingFunction(name)
>   }
> }
> ``` 

> [NOTE]  
> 왜 재귀적 갱신을 하는가?
> 자식 요소까지 재귀 렌더링해야 (변경에 영향을 받는) 트리 전체가 동기화됨  
> App.js만 그려도 하위가 반영되는 이유는 상태가 단방향으로 상위 → 하위로 전달되기 때문

## 4단계: 고차 함수 적용

레지스트리 로직을 추상화하기 위해 고차 함수를 사용합니다.  
`renderWrapper`의 개념이 고차 함수의 핵심입니다.  

`registry.js` (변경 없음 - 개념 강조):
```javascript
// 고차 함수 렌더링
const renderWrapper = component => {
  // ... (3단계와 동일)
}
```

`index.js` - 이건 왜 바꾼건지 모르겠음. 책에는 나오나?
```javascript
const render = () => {
  //... 원래 root 렌터링 로직
}

// N 초간 요소 랜덤하게 변경하는 로직 추가

render()
```

설명: `renderWrapper`는 함수(`component`)를 인자로 받아 새로운 함수를 반환하는 고차 함수입니다.  
이 패턴은 코드 재사용성과 구성 가능성을 높입니다.  

## 5단계: 동적 데이터 렌더링 및 가상 DOM

동적으로 변경되는 데이터를 처리하기 위해 가상 DOM과 `diff` 알고리즘을 도입하여 성능을 개선합니다.  

`applyDiff.js` (새 파일):
```javascript
const isNodeChanged = (node1, node2) => {
  // ... (속성, 자식, 텍스트 콘텐츠 비교)
}

const applyDiff = (
  parentNode,
  realNode,
  virtualNode) => {
  if (realNode && !virtualNode) {
    realNode.remove()
    return
  }

  if (!realNode && virtualNode) {
    parentNode.appendChild(virtualNode)
    return
  }

  if (isNodeChanged(virtualNode, realNode)) {
    realNode.replaceWith(virtualNode)
    return
  }

  const realChildren = Array.from(realNode.children)
  const virtualChildren = Array.from(virtualNode.children)

  const max = Math.max(
    realChildren.length,
    virtualChildren.length
  )
  for (let i = 0; i < max; i++) {
    applyDiff(
      realNode,
      realChildren[i],
      virtualChildren[i]
    )
  }
}

export default applyDiff
```

`index.js` (변경):
```javascript
import getTodos from './getTodos.js'
import todosView from './view/todos.js'
import counterView from './view/counter.js'
import filtersView from './view/filters.js'
import applyDiff from './applyDiff.js' // 'applyDiff' 임포트

import registry from './registry.js'

registry.add('todos', todosView)
registry.add('counter', counterView)
registry.add('filters', filtersView)

const state = {
  todos: getTodos(),
  currentFilter: 'All'
}

const render = () => {
  window.requestAnimationFrame(() => {
    const main = document.querySelector('.todoapp')
    const newMain = registry.renderRoot(main, state)
    applyDiff(document.body, main, newMain) // 'replaceWith' 대신 'applyDiff' 사용
  })
}

window.setInterval(() => {
  state.todos = getTodos()
  render()
}, 1000)

render()
```

설명:
- `setInterval`을 사용하여 1초마다 `state.todos`를 업데이트하고 `render` 함수를 호출합니다.  
- `render` 함수는 `replaceWith` 대신 `applyDiff`를 호출합니다.  
- `applyDiff` 함수는 현재 DOM과 새로 생성된 가상 DOM을 비교하여 변경된 부분만 실제 DOM에 적용합니다.  
이를 "조정(reconciliation)"이라고 합니다.  
  - 새로 생김, 없어짐, 달라짐 등을 확인해서 현재 노드 처리하고, 자식 노드 가져와서 재귀적으로 처리.
- 이 방식은 DOM 조작을 최소화하여 애플리케이션 성능을 향상시킵니다.  

## 결론

이 문서는 간단한 DOM 조작에서 시작하여 리팩토링, 컴포넌트 레지스트리, 가상 DOM과 `diff` 알고리즘을 사용하는 렌더링 엔진까지의 구현 과정을 다룹니다.  
이를 통해 프레임워크 없이 효율적이고 유지보수 가능한 프론트엔드 애플리케이션을 구축하는 방법을 이해할 수 있습니다.

## 6단계: 반응형(Reactivity) 기반 렌더링

(메모: AI 기반으로 정리한거라 정확하지 않을 수 있음. 대충 개념만 보고, 실제 동작 같은건 다시 확인해야 함.)

지금까지는 Virtual DOM과 `diff` 알고리즘을 사용해 변경 사항을 찾아내는 방식이었습니다.
하지만 SolidJS나 Svelte와 같은 최신 프레임워크는 **반응형 기반 렌더링(fine-grained reactivity)** 을 사용합니다.

### 상태(State), 파생 상태(Derived State), 이펙트(Effect)

- **State (Signal)**
  가장 기본이 되는 값.
```js
const [count, setCount] = createSignal(0);
````

`count()`를 읽으면 현재 값을 가져오고, `setCount`로 값을 변경합니다.

* **Derived State (Memo)**
  다른 state에 의존해 계산된 값.

```js
const double = createMemo(() => count() * 2);
```

`count`가 바뀌면 자동으로 다시 계산됩니다.

* **Effect**
  특정 state나 derived state를 읽고 부수효과(예: DOM 업데이트)를 실행하는 코드.

```js
createEffect(() => {
    console.log("Count is", count());
});
```

### 값 + 구독자 리스트

Signal은 단순히 값(상태)만 저장하는 것이 아니라, **이 값을 읽은 곳(구독자 리스트)** 도 저장합니다.

* `count()`를 읽을 때 → 현재 실행 중인 Effect나 Memo가 구독자로 등록됩니다.
* `setCount(newValue)`로 값이 바뀌면 → 해당 Signal을 구독한 Effect/Memo만 다시 실행됩니다.

> 📌 Derived State(`createMemo`)도 내부적으로는 Signal과 동일하게 동작합니다.  
> 다만 "저장된 값 + 계산 함수" 형태라, 새로운 값이 필요할 때만 재계산합니다.  

### JSX 컴파일 후 코드

SolidJS에서 JSX는 **컴파일 타임**에 실제 DOM 조작 코드로 변환됩니다.
예:

```jsx
function Counter() {
    const [count, setCount] = createSignal(0);
    return <button onClick={() => setCount(count() + 1)}>Count: {count()}</button>
}
```

컴파일 후:

```js
function Counter() {
    const [count, setCount] = createSignal(0);

    const button = document.createElement("button");
    button.onclick = () => setCount(count() + 1);

    const textNode = document.createTextNode("");
    button.appendChild(textNode);

    createEffect(() => {
        textNode.data = "Count: " + count();
    });

    return button;
}
```

즉, JSX는 런타임에는 존재하지 않고, **컴파일러가 DOM + effect 연결 코드로 변환**합니다.

### 단방향 Dependency Graph

Signal → Effect → DOM 혹은 다른 Signal로 이어지는 그래프를 형성합니다.
대부분은 단방향으로 전파되어 성능이 뛰어나지만, 개발자가 잘못 설계하면 순환 참조가 생길 수 있습니다.

예 (무한 루프 발생):

```js
createEffect(() => setA(b()));
createEffect(() => setB(a()));
```

이 경우 `a → b → a` 구조가 되어 값 변경이 무한히 전파됩니다.
이를 막으려면 `createMemo`를 활용하거나 조건부 업데이트를 해야 합니다.

---

## Svelte Runes와의 대응 관계

Svelte 5의 Runes도 SolidJS의 반응성 철학과 매우 유사합니다.

| 개념          | SolidJS        | Svelte Runes |
| ----------- | -------------- | ------------ |
| State       | `createSignal` | `$state`     |
| Derived     | `createMemo`   | `$derived`   |
| Effect      | `createEffect` | `$effect`    |
| DOM Binding | JSX 컴파일러       | 템플릿/런타임 컴파일러 |

공통점:

* 값 단위의 반응성 (fine-grained reactivity)
* 값이 바뀌면 관련된 부분만 즉시 갱신
* Virtual DOM diff 불필요

차이점:

* SolidJS: React와 호환되는 JSX 문법 차용
* Svelte: 자체 문법(`$state`, `$effect` 등) 도입
