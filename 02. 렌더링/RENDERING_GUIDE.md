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
- 이 방식은 DOM 조작을 최소화하여 애플리케이션 성능을 향상시킵니다.  

## 결론

이 문서는 간단한 DOM 조작에서 시작하여 리팩토링, 컴포넌트 레지스트리, 가상 DOM과 `diff` 알고리즘을 사용하는 렌더링 엔진까지의 구현 과정을 다룹니다.  
이를 통해 프레임워크 없이 효율적이고 유지보수 가능한 프론트엔드 애플리케이션을 구축하는 방법을 이해할 수 있습니다.
