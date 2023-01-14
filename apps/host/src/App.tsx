import { Suspense, lazy } from "react";

const RemoteFeature = lazy(() => import("remote1/Feature"));

export default function App() {
  return (
    <div>
      <h1>나는야 호스트</h1>
      <Suspense fallback={null}>
        <RemoteFeature />
      </Suspense>
    </div>
  );
}
