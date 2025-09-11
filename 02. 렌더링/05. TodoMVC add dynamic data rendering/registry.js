/**
 * 모든 컴포넌트의 렌더링 함수를 저장하는 레지스트리
 * 키: 컴포넌트 이름, 값: renderWrapper로 감싸진 렌더링 함수
 * @type {Record<string, (targetElement: HTMLElement, state: object) => HTMLElement>}
 */
const registry = {}

/**
 * 받은 컴포넌트와 그 자식들을 렌더링한다. (실제 DOM인지 가상 DOM인지 구분하지 않고 렌더링한다.)
 * (대부분 JS 메모리로만 존재하는 가상 DOM을 전달받고, 이후 applyDiff를 통해서 변경이 생긴 부분만 변경한다.)
 *
 * 왜 render 함수는 targetElement, state를 받는가?
 * renderWrapper는 컴포넌트를 추상화해서 렌더링 로직을 통일하기 위해 존재한다.
 * ./view/ 아래의 js로 구현된 컴포넌트들은 다들 이 계약(인터페이스 or 덕타이핑)를 구현한다.
 * 그래서 다음 장에 events 추가되면 render()의 명세는 (targetElement, state, events) => {} 가 된다.
 *
 * @param {(targetElement: HTMLElement, state: object) => HTMLElement} component
 *        - 원본 컴포넌트 함수 (DOM 엘리먼트를 반환하는 함수)
 * @returns {(targetElement: HTMLElement, state: object) => HTMLElement}
 *          - 자식 컴포넌트 자동 렌더링 기능이 추가된 새로운 렌더링 함수
 */
const renderWrapper = component => {
    function render(targetElement, state) {
        // 1. 전달받은 component 함수를 호출하여 DOM 엘리먼트 생성
        // component는 함수이므로 component(targetElement, state) 형태로 호출 가능
        const element = component(targetElement, state)

        // 2. 생성된 엘리먼트에서 data-component 속성을 가진 모든 자식 엘리먼트 탐색
        const childComponents = element.querySelectorAll('[data-component]')

        // 3. 각 자식 컴포넌트를 순회하며 렌더링
        Array.from(childComponents).forEach(target => {
            // data-component 속성값으로 컴포넌트 이름 추출
            const name = target.dataset.component

            // 레지스트리에서 해당 이름의 렌더링 함수 조회
            const childRender = registry[name]

            // 등록되지 않은 컴포넌트는 건너뛰기
            if (!childRender) {
                return
            }

            // 4. 자식 컴포넌트 렌더링 후 기존 엘리먼트와 교체
            // childRender도 renderWrapper로 감싸진 함수이므로 재귀적으로 렌더링됨
            target.replaceWith(childRender(target, state))
        })

        return element
    }

    return render
}

/**
 * 컴포넌트를 레지스트리에 등록합니다.
 * 등록 시 renderWrapper로 감싸서 자식 컴포넌트 자동 렌더링 기능을 추가합니다.
 *
 * @param {string} name - 컴포넌트 식별용 이름 (data-component 속성값과 매칭)
 * @param {(targetElement: HTMLElement, state: object) => HTMLElement} component
 *        - 등록할 원본 컴포넌트 함수
 */
const add = (name, component) => {
    // component를 renderWrapper로 감싸서 레지스트리에 저장
    // 이제 registry[name]은 자식 컴포넌트 자동 렌더링 기능이 있는 함수
    registry[name] = renderWrapper(component)
}

/**
 *
 *
 * @param {HTMLElement} root - 실제 DOM에서 선택한 최상위 노드
 * @param {object} state - 앱 전역 상태 객체
 * @returns {HTMLElement} - 모든 하위 컴포넌트가 렌더링된 가상 DOM 루트
 */
const renderRoot = (root, state) => {
    // root DOM을 복제하는 함수를 컴포넌트 함수 형태로 정의
    // 주의: 이 함수는 targetElement만 받지만, renderWrapper에서 (targetElement, state) 2개 인자로 호출됨
    // JavaScript에서 함수의 매개변수보다 많은 인자를 전달하면 추가 인자는 무시됨
    const cloneComponent = targetElement => root.cloneNode(true)

    // cloneComponent를 renderWrapper로 감싸서 실행
    // 1. cloneComponent(root, state) 호출 → state는 무시되고 root.cloneNode(true) 실행
    // 2. 복제된 엘리먼트에서 data-component 자식들을 찾아 렌더링
    return renderWrapper(cloneComponent)(root, state)
}

export default {
    add,
    renderRoot,
}
