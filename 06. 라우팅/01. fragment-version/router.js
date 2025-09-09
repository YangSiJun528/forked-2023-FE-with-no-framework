const ROUTE_PARAMETER_REGEXP = /:(\w+)/g;
// URL 경로 안에서 ":id" 같은 파라미터를 찾기 위한 정규식
// 예: "/user/:id" → id 라는 파라미터 이름 추출

const URL_FRAGMENT_REGEXP = '([^\\/]+)';
// 실제 값이 들어올 자리를 정규식으로 치환
// 예: "/user/:id" → "/user/([^/]+)" 로 바꿈

const extractUrlParams = (route, windowHash) => {
    const params = {};

    if (route.params.length === 0) {
        return params; // 파라미터 없으면 빈 객체 반환
    }

    // 현재 해시에서 route에 매칭되는 부분 추출
    const matches = windowHash.match(route.testRegExp);

    matches.shift(); // 첫 번째 전체 매칭 결과는 버림

    // 추출한 값들을 params 객체에 { 파라미터명: 값 } 형태로 저장
    matches.forEach((paramValue, index) => {
        const paramName = route.params[index];
        params[paramName] = paramValue;
    });

    return params;
};

export default () => {
    const routes = []; // 등록된 라우트 목록
    let notFound = () => {}; // 없는 경로일 때 실행되는 콜백

    const router = {};

    const checkRoutes = () => {
        const { hash } = window.location;

        // 현재 해시에 매칭되는 라우트 찾기
        const currentRoute = routes.find((route) => {
            const { testRegExp } = route;
            return testRegExp.test(hash);
        });

        if (!currentRoute) {
            notFound(); // 매칭 없으면 notFound 콜백 실행
            return;
        }

        // URL 파라미터 추출
        const urlParams = extractUrlParams(currentRoute, window.location.hash);

        // 해당 라우트 컴포넌트 실행
        currentRoute.component(urlParams);
    };

    router.addRoute = (fragment, component) => {
        const params = [];

        // 경로 정의 안에서 ":id" 같은 파라미터를 정규식으로 치환
        const parsedFragment = fragment
            .replace(ROUTE_PARAMETER_REGEXP, (match, paramName) => {
                params.push(paramName); // 파라미터 이름 저장
                return URL_FRAGMENT_REGEXP; // 값이 들어올 자리로 변환
            })
            .replace(/\//g, '\\/'); // "/"는 정규식에서 특수문자라 escape 필요

        console.log(`^${parsedFragment}$`);

        // 라우트 등록
        routes.push({
            testRegExp: new RegExp(`^${parsedFragment}$`), // 정규식 패턴
            component, // 실행할 컴포넌트(콜백)
            params, // 파라미터 이름들
        });

        return router;
    };

    router.setNotFound = (cb) => {
        notFound = cb; // 404 핸들러 등록
        return router;
    };

    router.navigate = (fragment) => {
        window.location.hash = fragment; // 해시 변경해서 페이지 이동
    };

    router.start = () => {
        // 해시가 바뀔 때마다 라우트 체크
        window.addEventListener('hashchange', checkRoutes);

        // 해시가 비어 있으면 기본값 "#/"로 설정
        if (!window.location.hash) {
            window.location.hash = '#/';
        }

        checkRoutes(); // 초기 진입 시 현재 해시 확인
    };

    return router;
};
