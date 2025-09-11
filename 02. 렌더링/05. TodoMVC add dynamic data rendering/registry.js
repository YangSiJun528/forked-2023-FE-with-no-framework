const registry = {}

const renderWrapper = component => {
    return (targetElement, state) => {
        // 현재 컴포넌트 실행
        const element = component(targetElement, state)

        // 자식 컴포넌트 탐색
        const childComponents = element.querySelectorAll('[data-component]')

        Array
            .from(childComponents)
            .forEach(target => {
                const name = target.dataset.component
                // child의 타입도 renderWrapper()의 반환 결과인 (targetElement, state) => {}임.
                const child = registry[name]

                if (!child) {
                    return // 등록되지 않은 컴포넌트는 무시
                }

                // 자식 DOM 요소를 해당 컴포넌트로 교체 (콜백 호출, 커링)
                // (교체된 컴포넌트 내부에서도 같은 방식으로 재귀 탐색 수행)
                target.replaceWith(child(target, state))
            })

        return element
    }
}

// 컴포넌트를 받고 등록함.
const add = (name, component) => {
    registry[name] = renderWrapper(component)
}

const renderRoot = (root, state) => {
    // cloneComponent = root를 복사한 가상 돔을 만들어 냄
    const cloneComponent = root => {
        return root.cloneNode(true)
    }

    return renderWrapper(cloneComponent)(root, state)
}

export default {
    add,
    renderRoot
}
