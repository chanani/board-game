package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.member.domain.Avatar;
import com.boardgame.support.FixedRandom;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AvatarDrawTest {

    @Test
    void R4_방_안_다른_사람과_겹치지_않는_그림을_무작위로_고른다() {
        Set<Avatar> taken = EnumSet.of(Avatar.CAT, Avatar.DOG);

        assertThat(AvatarDraw.pick(taken, new FixedRandom(0))).isEqualTo(Avatar.RABBIT);
        assertThat(AvatarDraw.pick(taken, new FixedRandom(9))).isEqualTo(Avatar.PENGUIN);
    }

    @Test
    void R4_모두_겹치면_아무거나_고른다() {
        Set<Avatar> taken = EnumSet.allOf(Avatar.class);

        assertThat(AvatarDraw.pick(taken, new FixedRandom(1))).isEqualTo(Avatar.DOG);
    }
}
