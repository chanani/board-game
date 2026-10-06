package com.boardgame.support;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Delayed;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;

// 실제로 기다리지 않는 예약기. 예약된 작업을 기록해 두고 테스트가 원할 때 직접 실행한다.
public class FakeTaskScheduler implements TaskScheduler {

    private final List<ScheduledTask> tasks = new ArrayList<>();

    @Override
    public ScheduledFuture<?> schedule(Runnable task, Instant startTime) {
        ScheduledTask scheduled = new ScheduledTask(task, startTime);
        tasks.add(scheduled);
        return scheduled;
    }

    public List<ScheduledTask> tasks() {
        return tasks;
    }

    public ScheduledTask latest() {
        return tasks.get(tasks.size() - 1);
    }

    @Override
    public ScheduledFuture<?> schedule(Runnable task, Trigger trigger) {
        throw new UnsupportedOperationException();
    }

    @Override
    public ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Instant startTime, Duration period) {
        throw new UnsupportedOperationException();
    }

    @Override
    public ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Duration period) {
        throw new UnsupportedOperationException();
    }

    @Override
    public ScheduledFuture<?> scheduleWithFixedDelay(Runnable task, Instant startTime, Duration delay) {
        throw new UnsupportedOperationException();
    }

    @Override
    public ScheduledFuture<?> scheduleWithFixedDelay(Runnable task, Duration delay) {
        throw new UnsupportedOperationException();
    }

    public static final class ScheduledTask implements ScheduledFuture<Object> {

        private final Runnable task;
        private final Instant startTime;
        private boolean cancelled;

        private ScheduledTask(Runnable task, Instant startTime) {
            this.task = task;
            this.startTime = startTime;
        }

        // 취소되었더라도 실행한다. 취소 직전에 이미 시작된 작업(경쟁 상황)을 흉내 내기 위해서다.
        public void run() {
            task.run();
        }

        public Instant startTime() {
            return startTime;
        }

        @Override
        public boolean cancel(boolean mayInterruptIfRunning) {
            cancelled = true;
            return true;
        }

        @Override
        public boolean isCancelled() {
            return cancelled;
        }

        @Override
        public boolean isDone() {
            return cancelled;
        }

        @Override
        public Object get() {
            return null;
        }

        @Override
        public Object get(long timeout, TimeUnit unit) {
            return null;
        }

        @Override
        public long getDelay(TimeUnit unit) {
            return 0;
        }

        @Override
        public int compareTo(Delayed other) {
            return 0;
        }
    }
}
