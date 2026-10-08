package com.boardgame.oldmaid.bot;

// 조커가 새로 손에 들어왔는데 아직 섞지 않았는지. 도착마다 번호(key)를 붙인다.
// 처음 받은 패에 조커가 있어도 "받은" 것으로 친다(R36 "조커를 받으면"): 처음 화면에서 held가 거짓에서 시작한다.
final class JokerArrival {

    private boolean held;
    private boolean waiting;
    private long arrivals;

    void observe(OldMaidSight sight) {
        boolean holds = sight.holdsJoker();
        if (holds && !held) {
            arrivals++;
            waiting = true;
        }
        waiting = holds && waiting;
        held = holds;
    }

    /** 실제로 섞은 것을 본 뒤에만 부른다(계획만 한 때는 부르지 않는다). */
    void shuffled() {
        waiting = false;
    }

    boolean isWaiting() {
        return waiting;
    }

    long key() {
        return arrivals;
    }
}
