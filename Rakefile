prefix    = File.dirname( __FILE__ )

# Directory variables
src_dir   = File.join( prefix, 'src' )
build_dir = File.join( prefix, 'build' )
test_dir  = File.join( prefix, 'test' )

# A different destination directory can be set by
# setting DIST_DIR before calling rake
dist_dir  = ENV['DIST_DIR'] || File.join( prefix, 'dist' )


# General Variables
date       = `git log -1`[/^Date:\s+(.+)$/, 1]
version    = File.read( File.join( prefix, 'version.txt' ) ).strip

# jQuery files/dirs
transform_dir = File.join( src_dir, "transform" )
transform_src_dir = File.join( transform_dir, "src" )
transform_files = %w{transform transform.attributes transform.animate angle matrix.calculations matrix.functions}.map { |js| File.join( transform_src_dir, "jquery.#{js}.js" ) }
transform_version_file = File.join( transform_dir, 'version.txt' )
transform_version = ''
transform3d_files = %w{transform3d transform3d.attributes transform3d.animate matrix3d matrix3d.calculations matrix3d.functions}.map { |js| File.join( src_dir, "jquery.#{js}.js" ) }

jq         = File.join( dist_dir, "jquery.transform3d-#{version}.js" )
jq_min     = File.join( dist_dir, "jquery.transform3d-#{version}.min.js" )
jq_test    = File.join( dist_dir, "jquery.transform3d.js" )


# Build tools
rhino      = "java -jar \"#{build_dir}/js.jar\""
minfier    = "java -jar \"#{build_dir}/yuicompressor-2.4.2.jar\""

# Turn off output other than needed from `sh` and file commands
verbose(false) 

# Tasks
task :default => "all"

desc "Builds jQuery; Tests with JSLint; Minifies jQuery"
task :all => [:dist, :jquery, :lint, :min] do
  puts "jQuery build complete."
end

desc "Builds jQuery Transform 3d: jquery.transform3d.js (Default task)"
task :jquery => [:transform, jq, jq_test]

desc "Builds a minified version of jQuery Transform 3d: jquery.transform3d.min.js"
task :min => jq_min

task :transform => transform_dir do
	transform_git = File.join(transform_dir, '.git')
	puts "Updating Transform with latest..."
		sh "git --git-dir=\"#{transform_git}\" pull -q origin master"
	transform_version = File.read( transform_version_file ).strip
end

desc "Removes dist folder"
task :dist do
  puts "Removing Distribution directory: #{dist_dir}..." 
  rm_rf dist_dir
end

task :clean => :dist do
  puts "Removing cloned directories..."
  rm_rf transform_dir # doesn't actually delete it??
end

desc "Tests built jquery.transform3d.js against JSLint"
task :lint => jq do
  puts "Checking jQuery against JSLint..."
  sh "#{rhino} \"" + File.join(build_dir, 'jslint-check.js') + "\""
end


# File and Directory Dependencies
directory dist_dir

file jq => [dist_dir, transform3d_files].flatten do
  puts "Building jquery.transform3d.js..."
  
  puts "...Building Transform version #{transform_version}"
  File.open(jq, 'w') do |f|
    f.write cat(transform_files).gsub(/(Date:.)/, "\\1#{date}" ).gsub(/@VERSION/, transform_version)
  end
  
  puts "...Building Transform 3d version #{version}"
  File.open(jq, 'a') do |f|
    f.write cat(transform3d_files).gsub(/(Date:.)/, "\\1#{date}" ).gsub(/@VERSION/, version)
  end
end

file jq_min => jq do
  puts "Building jquery.transform3d.min.js..."
  sh "#{minfier} -o \"#{jq_min}\" \"#{jq}\""
end

file jq_test => jq do
  puts "Building a test version of Transform 3d..."
  cp jq, jq_test
end

file transform_dir do
  puts "Retrieving jQuery Transform from Github..."
  sh "git clone git://github.com/heygrady/transform.git \"#{transform_dir}\""
end

def cat( files )
  files.map do |file|
    File.read(file)
  end.join('')
end