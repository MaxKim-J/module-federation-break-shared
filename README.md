# module-federation-break-shared

yarn workspace 모노레포 환경에서, 모노레포 내부 패키지를 shared 의존성으로 설정하고
Webpack5의 Module Federation Plugin을 사용할 때 shared 의존성 옵션에 따라 버전이 언제 어떻게 깨지는지 직접 실험해봅니다.

- yarn berry + workspace
- webpack + module federation plugin
- react

## 시나리오

### 버전 일치, 불일치

기본적으로, Host와 Remote는 모두 각자 shared에 명시된 패키지들을 모두 번들링 결과물에 가지고 있다. Host shared에서 fallback이 필요한 경우 자기 번들에서 해당 패키지를 꺼내쓰기 위함이다.

shared에 기록된 semver의 버전을 기준으로 compatible 여부를 따진다.

shared 의존성의 인스턴스 개수는 버전을 기준으로 버전 개수만큼 존재한다.

#### 호환 가능

Host와 Remote의 shared에서 가장 높은 버전을 매치해서 사용.

아래 경우는 compatible한 경우로, remote와 host 모두에서 1.0.1 버전을 공유한다.

- Host: `package@^1.0.0` -> `1.0.1`
- Remote: `package@^1.0.1` -> `1.0.1`

#### 호환 불가능

semver 기준으로 호환되지 않는 경우, host와 remote는 각각 다른 버전을 가진 패키지 인스턴스를 사용한다.

- Host: `package@~1.0.0` -> `1.0.0`
- Remote: `package@1.1.0` -> `1.1.0`

만약에 dynamically하게 remote 번들을 가져오는 경우, semver기호가 무시되고(실험 요망) 명시된 버전으로 사용된다. 늦게 로드된 remote가 이미 로드된 host 버전의 패키지를 파악할 수 없기 때문에, fallback으로 shared의 strict한 버전을 따른다.

- Host: `package@^1.0.0` -> `1.0.0`
- Remote: `package@^1.0.1` -> `1.0.1`

근데 dynamically하게 remote를 불러오는 경우 host가 버전이 더 높을 경우에는 Host의 버전을 따라간다(?왜지) 따라서 Host가 패키지의 highest compatible version을 제공하는게 비교적 안전한 편이라고 할 수 있음.

- Host: `package@^1.1.0` -> `1.1.0`
- Remote: `package@^1.0.1` -> `1.1.0`

### shared option 사용하여 관리하기

앞에서는 버전 불일치하는 경우 fallback 버전을 쓰는 형태였다. 요런게 항상 좋지만은 않은데 버전이 달라진 패키지가 여러개가 있는 경우 앱에서 이상한 일이 생길수도 있다.

singleton 옵션을 주면 모듈은 딱 한번만 로드되는것이 보장된다. singleton은 버전 미스매치로 인해 remote가 fallback 버전의 패키지를 호출하는 것 자체를 막는다.

```ts
 shared: {
   "package": {
     singleton: true,
   }
 },
```

singleton 옵션을 주는 경우, 해당 패키지의 **가장 먼저 평가되는 버전**(initialization phase)으로 shared로 공유받는 패키지의 버전이 통일된다. 주로 Host의 패키지 버전일테다. 이런 경우에도 사실 breaking change 등으로 인터페이스가 깨지지만 않는다면 런타임에 문제는 없다.

`strictVersion:true` 옵션을 같이 주면 버전이 uncompat한 경우 에러를 뿜는다. breaking change 등으로 인터페이스가 깨지는 것을 방지하기 위한 용도로 활용할 수 있다.

```ts
 shared: {
   "package": {
     singleton: true,
     strictVersion: true
   }
 },
```

`requiredVersion` 옵션을 사용해서 compat한 버전의 범위를 줄 수도 있다. 좀더 높은 버전의 패키지가 브레이킹 체인지 등이 없다고 확신할 수 있는 경우에 사용 가능할테다.

근데 먼가 요거는 개운치 않긴함. 호환 불가능하면 걍 깨져야되는거 아닌가?? 싶음

```ts
 shared: {
   "package": {
     singleton: true,
     strictVersion: true,
     requiredVersion: ">=1.1.0 <3.0.0"
   }
 },
```

#### 챔고1) shared options

- `requiredVersion`
- `strictVersion`
- `singleton`
- `eager`:
- `version`:

#### 챔고2) Semver 기호

- `^`: 요 버전 이상, we can also go with a higher minor and patch versions
- `~`: 요 버전 이상, that only a higher patch version but not a higher minor version is acceptable
- 기호 없음: strict하게 일치해야함

## 기타 시나리오

위의 시나리오는 모노레포 환경에서 패키지가 정상적으로 버저닝이 되고, 빌드 타임 등에 해당 패키지의 업데이트 여부 등등이 제대로 반영될때만 잘 동작한다.

근데 현실은 녹록치 않기 때문에, 이상적인 모노레포 패키지 관리가 이뤄지지 않는 경우나 패키지가 제공하는 API가 특별해서 감안해야하는 문제가 생길수도 있음. 다음과 같다.

### 전체 앱에서 하나여야만 하는 무언가를 제공하는 shared 의존성의 경우(Context API)

Host와 Remote간 Context API등으로 데이터를 공유할때는 **semver mismatch**가 아예 일어나서는 안되는데, singleton인게 보장되어야 하기 때문이다. 그래야 단일한 provider와 단일한 consumer가 존재 가능하고 참조가 올바르게 진행된다.

### workspace 환경에서 버저닝으로 패키지를 관리하지 않는 경우

먼저, 버전으로 변경 추적이 안 되는 경우다. 패키지의 변경에 따라서 같이 version 필드가 바뀌지 않는다면 버전은 그대로 유지한채 패키지가 바뀌어있을 것이다. 이때, 이러한 패키지를 shared로 가진 remote와 host 모두가 시간차이를 두고 배포되면, 버전은 똑같지만 그 사이에서 breaking change가 생겨버려 배포시에 다운타임이 생길 수 있다.

이상하긴 한데 version 필드가 아예 없는 경우라면 어떨까?

### 특정 패키지를 래핑해서 shared로 쓰는 경우

특정 패키지를 래핑한 패키지를 shared로 쓰는 경우, 래핑한 패키지에 해당하는 코드만 shared로 떨어지고 래핑된 패키지는 상관없다.

### package.json의 버전과 shared 버전의 관계

shared의 버전과 Package.json에 명시된 버전부터 틀려버리면 어떤 일이 발생할까?

## Reference

- [Getting Out of Version-Mismatch-Hell with Module Federation](https://www.angulararchitects.io/en/aktuelles/getting-out-of-version-mismatch-hell-with-module-federation/)
- [4 Ways to Use Dynamic Remotes in Module Federation](https://oskari.io/blog/dynamic-remotes-module-federation/)
