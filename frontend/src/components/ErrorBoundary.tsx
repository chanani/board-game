import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Panel } from './ui';

type Props = { children: ReactNode; onReload?: () => void };
type State = { failed: boolean };

const reloadPage = () => window.location.reload();

/**
 * 화면을 그리다 예외가 나면 React는 화면 전체를 비운다. 빈 화면 대신 안내와 새로고침 버튼을 보여 준다.
 * 안내는 다른 컨텍스트(알림·로그인·실시간 연결)에 기대지 않는다. 그쪽이 고장 났을 수도 있기 때문이다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('화면을 그리다 오류가 났어요.', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center p-4">
        <Panel as="div" className="w-full max-w-sm text-center">
          <h1 className="text-lg font-bold text-wood-800">화면을 그리다 문제가 생겼어요</h1>
          <p className="mt-2 text-sm text-stone-500">새로고침하면 하던 곳에서 다시 이어 갈 수 있어요.</p>
          <Button className="mt-4" onClick={this.props.onReload ?? reloadPage}>새로고침</Button>
        </Panel>
      </div>
    );
  }
}
