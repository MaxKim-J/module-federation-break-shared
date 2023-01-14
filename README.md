# module-federation-break-shared

yarn workspace 모노레포 환경에서, 모노레포 내부 패키지를 shared 의존성으로 설정하고
Webpack5의 Module Federation Plugin을 사용할 때 shared 의존성 옵션에 따라 버전이 언제 어떻게 깨지는지 직접 실험해봅니다.

- yarn berry + workspace
- webpack + module federation plugin
- react
