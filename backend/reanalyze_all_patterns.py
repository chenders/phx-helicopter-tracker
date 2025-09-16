"""
Script to re-analyze all flights for abnormal patterns with improved algorithm
"""
from app.workers.abnormal_pattern_tasks import detect_abnormal_flight_patterns
import time

def main():
    print("Starting comprehensive re-analysis of all flights...")
    
    batch_size = 100
    total_analyzed = 0
    total_abnormal = 0
    iteration = 0
    
    while True:
        iteration += 1
        print(f"\n--- Batch {iteration} ---")
        
        try:
            result = detect_abnormal_flight_patterns(
                batch_size=batch_size,
                min_complexity_threshold=2.0
            )
            
            flights_analyzed = result.get('flights_analyzed', 0)
            abnormal_found = len(result.get('abnormal_patterns_found', []))
            remaining = result.get('summary', {}).get('total_unanalyzed_remaining', 0)
            
            total_analyzed += flights_analyzed
            total_abnormal += abnormal_found
            
            print(f"Analyzed: {flights_analyzed} flights")
            print(f"Abnormal patterns found: {abnormal_found}")
            print(f"Remaining to analyze: {remaining}")
            print(f"Cumulative: {total_analyzed} analyzed, {total_abnormal} abnormal")
            
            # If no more flights to analyze, we're done
            if flights_analyzed == 0 or remaining == 0:
                print("\n✅ Analysis complete!")
                break
                
            # Small delay between batches
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error in batch {iteration}: {e}")
            break
    
    print(f"\n=== Final Results ===")
    print(f"Total flights analyzed: {total_analyzed}")
    print(f"Total abnormal patterns found: {total_abnormal}")
    print(f"Detection rate: {(total_abnormal/total_analyzed*100):.1f}%" if total_analyzed > 0 else "N/A")

if __name__ == "__main__":
    main()