package com.boardgame.room.domain;

import com.boardgame.member.domain.Avatar;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.Set;

// R4: 방 안 다른 참가자와 겹치지 않는 그림을 무작위로 고른다. 모두 겹치면 12종 중 아무거나.
public final class AvatarDraw {

    private AvatarDraw() {
    }

    public static Avatar pick(Set<Avatar> taken, Random random) {
        List<Avatar> pool = freeOf(taken);
        return pool.get(random.nextInt(pool.size()));
    }

    private static List<Avatar> freeOf(Set<Avatar> taken) {
        List<Avatar> free = Arrays.stream(Avatar.values())
                .filter(avatar -> !taken.contains(avatar))
                .toList();
        if (free.isEmpty()) {
            return List.of(Avatar.values());
        }
        return free;
    }
}
