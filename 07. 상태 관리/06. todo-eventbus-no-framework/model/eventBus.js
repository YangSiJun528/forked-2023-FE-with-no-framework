const cloneDeep = (x) => {
  return JSON.parse(JSON.stringify(x));
};

const freeze = (x) => Object.freeze(cloneDeep(x));

// 여기 제공되는 model도 콜백임`modelFactory`. 상태랑 이벤트 받아서, 이벤트 처리하면서 상태 업데이트 됨.
export default (model) => {
  let listeners = [];
  let state = model();

  // 구독 추가
  const subscribe = (listener) => {
    listeners.push(listener);

    return () => {
      listeners = listener.filter((l) => l !== listener);
    };
  };

  // 구독 전체 호출
  const invokeSubscribers = () => {
    const data = freeze(state);
    listeners.forEach((l) => l(data));
  };

  // 디스패치(보내다, 급파하다)
  // 상태를 업데이트하고 리스너(구독자)들을 호출한다. (구독자들이 렌더링이나 기타 처리)
  const dispatch = (event) => {
    const newState = model(state, event);

    if (!newState) {
      throw new Error('model should always return a value');
    }

    // 이전 상태와 새 상태가 동일하면 구독자를 건너뛴다.
    // 메모: 이거 맞나? 렌더링 관점에서 맞긴 한데, 혹시 모르는 이벤트가 있을 수 있지 않나?
    //  아님 그걸 변경으로 치치 않거나
    if (newState === state) {
      return;
    }

    // 항상 새로운 객체로 업데이트한다.
    state = newState;

    invokeSubscribers();
  };

  return {
    subscribe,
    dispatch,
    getState: () => freeze(state),
  };
};
