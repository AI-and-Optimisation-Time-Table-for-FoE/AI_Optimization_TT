with open(r"C:\Users\user\.gemini\antigravity\brain\fd0f17d3-21c7-44ae-9f35-d756cf132a43\.system_generated\tasks\task-2305.log", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Recent log lines containing ERROR, WARN, Exception, or Fail:")
for i, line in enumerate(lines):
    if any(k in line.upper() for k in ["ERROR", "WARN", "EXCEPTION", "FAIL"]):
        # print context (2 lines before and after if possible)
        start = max(0, i - 1)
        end = min(len(lines), i + 3)
        print(f"\n--- Line {i+1} ---")
        for j in range(start, end):
            print(f"{j+1}: {lines[j].strip()}")
