package com.foe.timetable;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.foe.timetable.model.dto.TimetableEntryViewDto;
import com.foe.timetable.service.TimetableGenerationService;
import com.foe.timetable.service.TimetableQueryService;

@SpringBootTest
class TimetableDbIntegrationTest {

    @Autowired
    private TimetableGenerationService timetableGenerationService;

    @Autowired
    private TimetableQueryService timetableQueryService;

    @Test
    void generateAndReadFromDatabase() {
        List<TimetableEntryViewDto> generated = timetableGenerationService.generateForBatch(1);
        assertFalse(generated.isEmpty(), "Expected generated timetable entries in database");

        List<TimetableEntryViewDto> loaded = timetableQueryService.getTimetableByBatchId(1);
        assertFalse(loaded.isEmpty(), "Expected timetable entries to be readable from database");
    }
}
