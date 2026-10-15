package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// 참가자 묶음(받은 순서 = 자리 순서).
public class Stackers {

    private static final int MIN = 1;
    private static final int SOLO = 1;
    private static final int MAX = 5;

    private final Map<PlayerId, Stacker> stackers = new LinkedHashMap<>();

    public Stackers(List<PlayerId> players) {
        if (players.size() < MIN || players.size() > MAX) {
            throw new BusinessException(ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
        }
        players.forEach(player -> stackers.put(player, new Stacker()));
    }

    boolean contains(PlayerId player) {
        return stackers.containsKey(player);
    }

    Stacker of(PlayerId player) {
        Stacker stacker = stackers.get(player);
        if (stacker == null) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return stacker;
    }

    Score scoreOf(PlayerId player) {
        Stacker stacker = of(player);
        return stacker.score();
    }

    PlayerState stateOf(PlayerId player) {
        Stacker stacker = of(player);
        return stacker.state();
    }

    boolean isPlaying(PlayerId player) {
        Stacker stacker = of(player);
        return stacker.isPlaying();
    }

    boolean isContender(PlayerId player) {
        Stacker stacker = of(player);
        return stacker.isContender();
    }

    boolean isSolo() {
        return stackers.size() == SOLO;
    }

    List<PlayerId> ids() {
        return List.copyOf(stackers.keySet());
    }

    List<PlayerId> playing() {
        return ids().stream()
                .filter(this::isPlaying)
                .toList();
    }

    List<PlayerId> contenders() {
        return ids().stream()
                .filter(this::isContender)
                .toList();
    }

    // R26 (가)·(나): 지금 끝났으면 그 이유. 혼자 하기(S2)는 (나)를 보지 않고 판이 살아 있는 동안 이어진다.
    Optional<FruitStackEndReason> verdict() {
        List<PlayerId> alive = playing();
        if (alive.isEmpty()) {
            return Optional.of(nobodyAliveReason());
        }
        if (alive.size() > 1 || isSolo()) {
            return Optional.empty();
        }
        return lastOneVerdict(alive.get(0));
    }

    // 겨루는 사람이 남아 있으면 모두 탈락한 것, 없으면(혼자 하기에서 내가 나감, S5) 기권으로 끝난 것.
    private FruitStackEndReason nobodyAliveReason() {
        if (contenders().isEmpty()) {
            return FruitStackEndReason.FORFEIT;
        }
        return FruitStackEndReason.ALL_OUT;
    }

    // R26 (나): 혼자 남은 사람. 견줄 사람이 없으면 FORFEIT, 모두보다 엄격히 높으면 DECIDED, 아니면 이어진다.
    private Optional<FruitStackEndReason> lastOneVerdict(PlayerId last) {
        List<Score> rivals = contenders().stream()
                .filter(player -> !player.equals(last))
                .map(this::scoreOf)
                .toList();
        if (rivals.isEmpty()) {
            return Optional.of(FruitStackEndReason.FORFEIT);
        }
        Score mine = scoreOf(last);
        if (rivals.stream().allMatch(mine::isAbove)) {
            return Optional.of(FruitStackEndReason.DECIDED);
        }
        return Optional.empty();
    }
}
