package com.boardgame.fruitstack;

import com.boardgame.game.ResultType;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

// R27: 겨루는 사람끼리의 승패·등수와 기권한 사람의 패배.
public class Standings {

    private final List<Standing> inSeatOrder;

    private Standings(List<Standing> inSeatOrder) {
        this.inSeatOrder = inSeatOrder;
    }

    static Standings of(Stackers stackers) {
        List<Score> rivals = stackers.contenders().stream()
                .map(stackers::scoreOf)
                .toList();
        List<Standing> entries = stackers.ids().stream()
                .map(player -> standing(stackers, player, rivals))
                .toList();
        return new Standings(entries);
    }

    private static Standing standing(Stackers stackers, PlayerId player, List<Score> rivals) {
        Score score = stackers.scoreOf(player);
        PlayerState state = stackers.stateOf(player);
        if (state == PlayerState.FORFEITED) {
            return new Standing(player, score, ResultType.LOSE, new Place(rivals.size() + 1), state);
        }
        long above = rivals.stream().filter(rival -> rival.isAbove(score)).count();
        long same = rivals.stream().filter(score::equals).count();
        return new Standing(player, score, resultOf(above, same), new Place((int) above + 1), state);
    }

    // 나보다 높은 사람이 있으면 패, 없고 같은 점수가 나뿐이면 승, 여럿이면 무.
    private static ResultType resultOf(long above, long same) {
        if (above > 0) {
            return ResultType.LOSE;
        }
        if (same > 1) {
            return ResultType.DRAW;
        }
        return ResultType.WIN;
    }

    public List<Standing> inSeatOrder() {
        return inSeatOrder;
    }

    // 등수 순, 같은 등수는 자리 순(안정 정렬).
    public List<Standing> entries() {
        return inSeatOrder.stream()
                .sorted(Comparator.comparingInt(Standing::placeValue))
                .toList();
    }

    public List<Standing> contenders() {
        return entries().stream()
                .filter(Standing::isContender)
                .toList();
    }

    public Optional<PlayerId> winner() {
        return inSeatOrder.stream()
                .filter(Standing::isWinner)
                .map(Standing::player)
                .findFirst();
    }
}
